Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\D E L L\.gemini\antigravity-ide\brain\321958f1-ba61-415a-9ac3-2eff054ffde0\tiruppur_banner_enhanced_1783081879565.png"
$img = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Enhanced Image Dimensions: $($img.Width) x $($img.Height)"
$img.Dispose()
