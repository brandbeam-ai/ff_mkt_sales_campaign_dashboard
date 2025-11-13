# Script to edit rebase todo list
$file = $args[0]
$content = Get-Content $file
$newContent = $content -replace '^pick c2b824a', 'edit c2b824a'
Set-Content $file $newContent


