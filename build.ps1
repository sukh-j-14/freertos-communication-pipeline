$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
 New-Item -ItemType Directory -Force build,results | Out-Null
 $kernel='vendor/FreeRTOS-Kernel'
 gcc -std=c11 -O2 -Wall -DWIN32_LEAN_AND_MEAN -Iconfig -I"$kernel/include" -I"$kernel/portable/MSVC-MingW" src/main.c "$kernel/tasks.c" "$kernel/queue.c" "$kernel/list.c" "$kernel/portable/MemMang/heap_4.c" "$kernel/portable/MSVC-MingW/port.c" -lwinmm -o build/pipeline.exe
 if($LASTEXITCODE -ne 0){throw 'Compilation failed'}
 foreach($scenario in @('normal','overload','stall','empty','corrupt')) {
  $result = & ./build/pipeline.exe $scenario
  if($LASTEXITCODE -ne 0){throw "Scenario failed: $scenario"}
  $result | Set-Content -Encoding ascii "results/$scenario.json"
  Write-Output $result
 }
 foreach($arguments in @(@('invalid'), @('normal','extra'))) {
  & ./build/pipeline.exe @arguments 2>$null
  if($LASTEXITCODE -ne 1){throw 'Invalid arguments must exit with status 1'}
 }
} finally {Pop-Location}
