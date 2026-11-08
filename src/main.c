#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "semphr.h"
typedef struct { unsigned sequence; TickType_t created; unsigned checksum; } packet;
typedef struct { unsigned produced,accepted,dropped,received,timeouts,corrupt,order_errors,max_depth; TickType_t max_latency; } metrics;
static QueueHandle_t queue;
static SemaphoreHandle_t lock,done;
static metrics stats;
static int overload,stall,empty,inject_corruption;
static const char *scenario="normal";
static unsigned checksum(unsigned seq){return seq^0xA5A55A5A;}
static void producer(void*arg){
 (void)arg;
 for(unsigned i=0;i<(empty?0U:100U);i++){
  packet p={i,xTaskGetTickCount(),checksum(i)};
  if(inject_corruption&&i==50)p.checksum^=1U;
  /* Lock covers enqueue and accounting; consumer never waits for lock while holding queue internals. */
  xSemaphoreTake(lock,portMAX_DELAY);
  stats.produced++;
  if(xQueueSend(queue,&p,0)==pdPASS)stats.accepted++;else stats.dropped++;
  unsigned depth=(unsigned)uxQueueMessagesWaiting(queue);if(depth>stats.max_depth)stats.max_depth=depth;
  xSemaphoreGive(lock);
  if(!overload&&!stall)vTaskDelay(pdMS_TO_TICKS(20));
 }
 xSemaphoreGive(done);vTaskSuspend(NULL);
}
static void consumer(void*arg){
 (void)arg;
 unsigned previous=0;
 int have_previous=0;
 for(;;){
  packet p;
  if(stall){vTaskDelay(pdMS_TO_TICKS(100));continue;}
  if(xQueueReceive(queue,&p,pdMS_TO_TICKS(50))==pdPASS){
   TickType_t latency=xTaskGetTickCount()-p.created;
   xSemaphoreTake(lock,portMAX_DELAY);stats.received++;
   if(p.checksum!=checksum(p.sequence))stats.corrupt++;
   if(have_previous&&p.sequence<=previous)stats.order_errors++;
   previous=p.sequence;have_previous=1;
   if(latency>stats.max_latency)stats.max_latency=latency;
   xSemaphoreGive(lock);
   vTaskDelay(pdMS_TO_TICKS(overload?30:10));
  }else{xSemaphoreTake(lock,portMAX_DELAY);stats.timeouts++;xSemaphoreGive(lock);}
 }
}
static void monitor(void*arg){
 (void)arg;
 configASSERT(xSemaphoreTake(done,pdMS_TO_TICKS(5000))==pdTRUE);
 TickType_t start=xTaskGetTickCount();
 for(;;){
  xSemaphoreTake(lock,portMAX_DELAY);int drained=stats.received==stats.accepted;xSemaphoreGive(lock);
  if(drained||xTaskGetTickCount()-start>=pdMS_TO_TICKS(2000))break;
  vTaskDelay(pdMS_TO_TICKS(20));
 }
 vTaskDelay(pdMS_TO_TICKS(100));
 xSemaphoreTake(lock,portMAX_DELAY);metrics s=stats;xSemaphoreGive(lock);
 int pass=s.produced==(empty?0U:100U)&&s.produced==s.accepted+s.dropped&&s.corrupt==(inject_corruption?1U:0U)&&s.order_errors==0&&s.max_depth<=8;
 if(stall)pass=pass&&s.received==0&&s.accepted==8&&s.dropped==92;
 else if(overload)pass=pass&&s.dropped>0&&s.received==s.accepted;
 else pass=pass&&s.dropped==0&&s.received==(empty?0U:100U)&&s.timeouts>0;
 printf("{\"scenario\":\"%s\",\"produced\":%u,\"accepted\":%u,\"dropped\":%u,\"received\":%u,\"timeouts\":%u,\"corrupt\":%u,\"order_errors\":%u,\"max_queue_depth\":%u,\"max_latency_ticks\":%lu,\"pass\":%s}\n",scenario,s.produced,s.accepted,s.dropped,s.received,s.timeouts,s.corrupt,s.order_errors,s.max_depth,(unsigned long)s.max_latency,pass?"true":"false");
 fflush(stdout);exit(pass?0:1);
}
int main(int argc,char**argv){
 if(argc>2||(argc==2&&strcmp(argv[1],"normal")&&strcmp(argv[1],"overload")&&strcmp(argv[1],"stall")&&strcmp(argv[1],"empty")&&strcmp(argv[1],"corrupt"))){fprintf(stderr,"usage: pipeline [normal|overload|stall|empty|corrupt]\n");return 1;}
 if(argc==2)scenario=argv[1];
 empty=!strcmp(scenario,"empty");inject_corruption=!strcmp(scenario,"corrupt");
 overload=argc==2&&!strcmp(argv[1],"overload");stall=argc==2&&!strcmp(argv[1],"stall");
 queue=xQueueCreate(8,sizeof(packet));lock=xSemaphoreCreateMutex();done=xSemaphoreCreateBinary();
 configASSERT(queue&&lock&&done);
 configASSERT(xTaskCreate(producer,"tx",1024,NULL,2,NULL)==pdPASS);
 configASSERT(xTaskCreate(consumer,"rx",1024,NULL,2,NULL)==pdPASS);
 configASSERT(xTaskCreate(monitor,"monitor",1024,NULL,3,NULL)==pdPASS);
 vTaskStartScheduler();return 2;
}
