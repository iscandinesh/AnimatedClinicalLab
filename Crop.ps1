Add-Type -AssemblyName System.Drawing
$inPath = "d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images\partners\padmanabans_heart.png"
$outPath = "d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images\partners\padmanabans_heart_cropped.png"
$img = [System.Drawing.Image]::FromFile($inPath)
$bmp = New-Object System.Drawing.Bitmap($img)

$x = [math]::Floor($bmp.Width * 0.18)
$y = [math]::Floor($bmp.Height * 0.15)
$w = [math]::Floor($bmp.Width * 0.35)
$h = [math]::Floor($bmp.Height * 0.50)

$rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
$format = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$cropped = $bmp.Clone($rect, $format)

$cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$cropped.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "Cropped successfully"
