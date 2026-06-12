Get-ChildItem C:\aaa -Recurse -File |
Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-30)} |
Sort-Object LastWriteTime -Descending |
Select-Object LastWrite, FullName