Const FOF_SILENT = &H4  ' don't create progress/report

Sub ExtractFilesFromZip(pathToZipFile, dirToExtractFiles)
 
    Dim fso
    Set fso = CreateObject("Scripting.FileSystemObject")
 
    pathToZipFile = fso.GetAbsolutePathName(pathToZipFile)
    dirToExtractFiles = fso.GetAbsolutePathName(dirToExtractFiles)
 
    If (Not fso.FileExists(pathToZipFile)) Then
        WScript.Echo "Zip file does not exist: " & pathToZipFile
        Exit Sub
    End If
 
    If Not fso.FolderExists(dirToExtractFiles) Then
        WScript.Echo "Directory does not exist: " & dirToExtractFiles
        Exit Sub
    End If
 
    dim sa
    set sa = CreateObject("Shell.Application")
 
    Dim zip
    Set zip = sa.NameSpace(pathToZipFile)
 
    Dim d
    Set d = sa.NameSpace(dirToExtractFiles)
 
    ' Look at http://msdn.microsoft.com/en-us/library/bb787866(VS.85).aspx
    ' for more information about the CopyHere function.
    d.CopyHere zip.items, 4
 
    Do Until zip.Items.Count <= d.Items.Count
        Wscript.Sleep(200)
    Loop
 
End Sub

'The location of the zip file.
ZipFile=WScript.Arguments.Item(0)
'The folder the contents should be extracted to.
ExtractTo=WScript.Arguments.Item(1)

ExtractFilesFromZip ZipFile, ExtractTo