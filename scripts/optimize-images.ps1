# PowerShell script to optimize diagnostic lab website images
Add-Type -AssemblyName System.Drawing

function Optimize-Image {
    param (
        [string]$inPath,
        [string]$outPath,
        [int]$maxSize,
        [string]$format # "png" or "jpg"
    )
    
    if (-not (Test-Path $inPath)) {
        Write-Host "File not found: $inPath" -ForegroundColor Yellow
        return
    }
    
    # Load image from stream to release the file lock immediately
    $stream = New-Object System.IO.FileStream($inPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
    $img = [System.Drawing.Image]::FromStream($stream)
    $stream.Close()
    $stream.Dispose()
    
    $w = $img.Width
    $h = $img.Height
    
    # Calculate new dimensions maintaining aspect ratio
    if ($w -gt $h) {
        if ($w -gt $maxSize) {
            $newW = $maxSize
            $newH = [int][math]::Round(($h * $maxSize) / $w)
        } else {
            $newW = $w
            $newH = $h
        }
    } else {
        if ($h -gt $maxSize) {
            $newH = $maxSize
            $newW = [int][math]::Round(($w * $maxSize) / $h)
        } else {
            $newW = $w
            $newH = $h
        }
    }
    
    # Perform resizing
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Set high quality render settings
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($img, 0, 0, $newW, $newH)
    $g.Dispose()
    
    if ($format -eq "png") {
        # Save transparent PNG (lock is released so in-place write succeeds)
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $msg = "Resized PNG: " + $outPath + " (" + $w + "x" + $h + " -> " + $newW + "x" + $newH + ")"
        Write-Host $msg -ForegroundColor Green
    } else {
        # Save compressed JPEG at 75% quality
        $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 98)
        
        $bmp.Save($outPath, $encoder, $encoderParams)
        $msg = "Converted to JPG: " + $outPath + " (" + $w + "x" + $h + " -> " + $newW + "x" + $newH + ")"
        Write-Host $msg -ForegroundColor Green
    }
    
    $bmp.Dispose()
    $img.Dispose()
}

$baseDir = "d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images"

# 1. Convert large photographic banners to JPG (Resize to max width of 1200px for mobile/desktop balance)
$banners = @(
    "tamil-home-blood-collection",
    "indian-doctor-family",
    "tamil-family-checkup",
    "tamil-couple-consultation",
    "about-banner",
    "locations-banner",
    "services-banner",
    "tiruppur-banner",
    "tiruppur-famous-banner",
    "tiruppur-district-heritage",
    "tiruppur-vibrant-textile",
    "tiruppur-vibrant-textile-desktop",
    "tiruppur-vibrant-textile-mobile",
    "tiruppur-textile-banner-dark",
    "event-camp",
    "event-offer",
    "home-visit",
    "indian-home-visit",
    "indian-cardiac-checkup",
    "indian-doctor-patient",
    "indian-lab-assistant",
    "indian-pathologist-new",
    "clinical-automated-new",
    "clinical-pathologist-new"
)

Write-Host "--- Optimizing Photographic Banners ---" -ForegroundColor Cyan
foreach ($banner in $banners) {
    Optimize-Image -inPath "$baseDir\$banner.png" -outPath "$baseDir\$banner.jpg" -maxSize 3072 -format "jpg"
}


# 2. Resize transparent badges and logo overlays (Keep PNG format for transparency)
Write-Host "--- Resizing Transparent Badges and Partner Logos ---" -ForegroundColor Cyan

# Trust Badges (Resize to 240px max)
Optimize-Image -inPath "$baseDir\anniversary-logo-trans.png" -outPath "$baseDir\anniversary-logo-trans.png" -maxSize 240 -format "png"
Optimize-Image -inPath "$baseDir\nabl-accredited-logo-trans.png" -outPath "$baseDir\nabl-accredited-logo-trans.png" -maxSize 240 -format "png"

# Partner Logos (Resize to 120px max)
Optimize-Image -inPath "$baseDir\partners\smc.png" -outPath "$baseDir\partners\smc.png" -maxSize 120 -format "png"
Optimize-Image -inPath "$baseDir\partners\arul_siddha.png" -outPath "$baseDir\partners\arul_siddha.png" -maxSize 120 -format "png"
Optimize-Image -inPath "$baseDir\partners\padmanabans_heart.png" -outPath "$baseDir\partners\padmanabans_heart.png" -maxSize 120 -format "png"
Optimize-Image -inPath "$baseDir\partners\manian_medical.png" -outPath "$baseDir\partners\manian_medical.png" -maxSize 120 -format "png"

Write-Host "Optimization Complete!" -ForegroundColor Cyan
