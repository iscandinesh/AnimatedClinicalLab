$path = 'd:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\Components\Pages\Locations.razor'
$content = Get-Content -Path $path -Raw
$content = $content -replace 'â€”', '—'
$content = $content -replace 'â€¢', '•'
$content = $content -replace 'â€“', '–'
$content = $content -replace 'style="font-size: 0.75rem; white-space: normal; word-break: break-all;"', 'style="font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; padding: 0 10px;"'
$content = $content -replace 'style="font-size:0.65rem; word-break: break-all;"', 'style="font-size:0.65rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;"'
$content = $content -replace '<span class="text-nowrap">81109&nbsp;66166</span>', '<span class="text-nowrap">70944&nbsp;90914</span>'
$content = $content -replace 'tel:\+918110966166', 'tel:+917094490914'
$content = $content -replace '<span class="text-nowrap">91500&nbsp;35203</span>', '<span class="text-nowrap">70944&nbsp;90100</span>'
$content = $content -replace 'tel:\+919150035203', 'tel:+917094490100'
Set-Content -Path $path -Value $content -Encoding UTF8
