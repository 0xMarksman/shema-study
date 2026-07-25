param(
  [ValidateSet("classic", "crest", "flight", "modern")]
  [string]$Variant = "crest",
  [switch]$PreviewOnly
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
  param(
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $Radius * 2
  if ($d -gt $Rect.Width) { $d = $Rect.Width }
  if ($d -gt $Rect.Height) { $d = $Rect.Height }

  $path.AddArc($Rect.X, $Rect.Y, $d, $d, 180, 90)
  $path.AddArc($Rect.Right - $d, $Rect.Y, $d, $d, 270, 90)
  $path.AddArc($Rect.Right - $d, $Rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-StarPen {
  param(
    [int]$Size,
    [System.Drawing.Color]$Color
  )

  $pen = New-Object System.Drawing.Pen($Color, [Math]::Max(2, [int]($Size * 0.03)))
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function Draw-StarOfDavid {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size,
    [System.Drawing.Color]$Color,
    [double]$Scale = 0.25,
    [double]$CenterY = 0.56
  )

  $pen = New-StarPen -Size $Size -Color $Color
  $cx = $Canvas.X + ($Canvas.Width / 2)
  $cy = $Canvas.Y + ($Canvas.Height * $CenterY)
  $r = $Canvas.Width * $Scale

  $up = @(
    [System.Drawing.PointF]::new($cx, $cy - $r),
    [System.Drawing.PointF]::new($cx - ($r * 0.866), $cy + ($r * 0.5)),
    [System.Drawing.PointF]::new($cx + ($r * 0.866), $cy + ($r * 0.5)),
    [System.Drawing.PointF]::new($cx, $cy - $r)
  )
  $dn = @(
    [System.Drawing.PointF]::new($cx, $cy + $r),
    [System.Drawing.PointF]::new($cx - ($r * 0.866), $cy - ($r * 0.5)),
    [System.Drawing.PointF]::new($cx + ($r * 0.866), $cy - ($r * 0.5)),
    [System.Drawing.PointF]::new($cx, $cy + $r)
  )

  $G.DrawLines($pen, $up)
  $G.DrawLines($pen, $dn)
  $pen.Dispose()
}

function Draw-DoveClassic {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size
  )

  $dovePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(247, 252, 255), [Math]::Max(2, [int]($Size * 0.032)))
  $dovePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $dovePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $dovePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.20, $Canvas.Y + $Canvas.Height * 0.45),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.32, $Canvas.Y + $Canvas.Height * 0.20),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.58, $Canvas.Y + $Canvas.Height * 0.22),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.70, $Canvas.Y + $Canvas.Height * 0.40)
  )
  $path.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.70, $Canvas.Y + $Canvas.Height * 0.40),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.82, $Canvas.Y + $Canvas.Height * 0.52),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.70, $Canvas.Y + $Canvas.Height * 0.70),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.50, $Canvas.Y + $Canvas.Height * 0.68)
  )
  $path.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.50, $Canvas.Y + $Canvas.Height * 0.68),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.44, $Canvas.Y + $Canvas.Height * 0.84),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.33, $Canvas.Y + $Canvas.Height * 0.84),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.30, $Canvas.Y + $Canvas.Height * 0.70)
  )
  $path.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.30, $Canvas.Y + $Canvas.Height * 0.70),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.18, $Canvas.Y + $Canvas.Height * 0.66),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.14, $Canvas.Y + $Canvas.Height * 0.54),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.20, $Canvas.Y + $Canvas.Height * 0.45)
  )
  $G.DrawPath($dovePen, $path)

  $eyeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(224, 238, 252))
  $G.FillEllipse($eyeBrush, $Canvas.X + $Canvas.Width * 0.60, $Canvas.Y + $Canvas.Height * 0.35, [Math]::Max(2, [int]($Size * 0.022)), [Math]::Max(2, [int]($Size * 0.022)))

  $beakBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 199, 128))
  $beakPts = @(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.66, $Canvas.Y + $Canvas.Height * 0.39),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.74, $Canvas.Y + $Canvas.Height * 0.41),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.67, $Canvas.Y + $Canvas.Height * 0.45)
  )
  $G.FillPolygon($beakBrush, $beakPts)

  $path.Dispose(); $beakBrush.Dispose(); $eyeBrush.Dispose(); $dovePen.Dispose()
}

function Draw-DoveCrest {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size
  )

  $wingBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 251, 255))
  $bodyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(231, 244, 255))
  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(203, 227, 246), [Math]::Max(2, [int]($Size * 0.015)))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $body = New-Object System.Drawing.Drawing2D.GraphicsPath
  $body.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.26, $Canvas.Y + $Canvas.Height * 0.63),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.32, $Canvas.Y + $Canvas.Height * 0.74),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.50, $Canvas.Y + $Canvas.Height * 0.73),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.57, $Canvas.Y + $Canvas.Height * 0.64)
  )
  $body.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.57, $Canvas.Y + $Canvas.Height * 0.64),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.66, $Canvas.Y + $Canvas.Height * 0.58),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.71, $Canvas.Y + $Canvas.Height * 0.47),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.67, $Canvas.Y + $Canvas.Height * 0.41)
  )
  $body.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.67, $Canvas.Y + $Canvas.Height * 0.41),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.60, $Canvas.Y + $Canvas.Height * 0.31),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.47, $Canvas.Y + $Canvas.Height * 0.31),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.39, $Canvas.Y + $Canvas.Height * 0.39)
  )
  $body.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.39, $Canvas.Y + $Canvas.Height * 0.39),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.25, $Canvas.Y + $Canvas.Height * 0.41),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.18, $Canvas.Y + $Canvas.Height * 0.53),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.26, $Canvas.Y + $Canvas.Height * 0.63)
  )
  $G.FillPath($bodyBrush, $body)

  $wing = New-Object System.Drawing.Drawing2D.GraphicsPath
  $wing.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.32, $Canvas.Y + $Canvas.Height * 0.54),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.44, $Canvas.Y + $Canvas.Height * 0.29),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.62, $Canvas.Y + $Canvas.Height * 0.30),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.68, $Canvas.Y + $Canvas.Height * 0.43)
  )
  $wing.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.68, $Canvas.Y + $Canvas.Height * 0.43),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.58, $Canvas.Y + $Canvas.Height * 0.48),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.46, $Canvas.Y + $Canvas.Height * 0.53),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.32, $Canvas.Y + $Canvas.Height * 0.54)
  )
  $G.FillPath($wingBrush, $wing)

  $tail = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tail.AddBezier(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.31, $Canvas.Y + $Canvas.Height * 0.64),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.22, $Canvas.Y + $Canvas.Height * 0.74),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.23, $Canvas.Y + $Canvas.Height * 0.84),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.34, $Canvas.Y + $Canvas.Height * 0.78)
  )
  $G.FillPath($wingBrush, $tail)

  $G.DrawBezier($linePen,
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.39, $Canvas.Y + $Canvas.Height * 0.49),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.46, $Canvas.Y + $Canvas.Height * 0.46),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.55, $Canvas.Y + $Canvas.Height * 0.45),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.63, $Canvas.Y + $Canvas.Height * 0.42)
  )

  $eye = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(117, 154, 188))
  $G.FillEllipse($eye, $Canvas.X + $Canvas.Width * 0.60, $Canvas.Y + $Canvas.Height * 0.40, [Math]::Max(2, [int]($Size * 0.018)), [Math]::Max(2, [int]($Size * 0.018)))

  $beakBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 191, 112))
  $beakPts = @(
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.65, $Canvas.Y + $Canvas.Height * 0.43),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.75, $Canvas.Y + $Canvas.Height * 0.45),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.66, $Canvas.Y + $Canvas.Height * 0.49)
  )
  $G.FillPolygon($beakBrush, $beakPts)

  $body.Dispose(); $wing.Dispose(); $tail.Dispose(); $beakBrush.Dispose(); $eye.Dispose(); $linePen.Dispose(); $bodyBrush.Dispose(); $wingBrush.Dispose()
}

function Draw-DoveFlight {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size
  )

  $stroke = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(246, 252, 255), [Math]::Max(2, [int]($Size * 0.028)))
  $stroke.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $stroke.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $stroke.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  # Upper wing sweep (ascending motion)
  $G.DrawBezier($stroke,
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.18, $Canvas.Y + $Canvas.Height * 0.60),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.28, $Canvas.Y + $Canvas.Height * 0.29),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.53, $Canvas.Y + $Canvas.Height * 0.27),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.69, $Canvas.Y + $Canvas.Height * 0.42)
  )

  # Body and lower arc
  $G.DrawBezier($stroke,
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.69, $Canvas.Y + $Canvas.Height * 0.42),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.77, $Canvas.Y + $Canvas.Height * 0.53),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.71, $Canvas.Y + $Canvas.Height * 0.71),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.52, $Canvas.Y + $Canvas.Height * 0.73)
  )

  # Tail drop and return
  $G.DrawBezier($stroke,
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.52, $Canvas.Y + $Canvas.Height * 0.73),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.45, $Canvas.Y + $Canvas.Height * 0.86),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.33, $Canvas.Y + $Canvas.Height * 0.84),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.29, $Canvas.Y + $Canvas.Height * 0.71)
  )

  # Inner wing contour for depth without extra details
  $G.DrawBezier($stroke,
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.27, $Canvas.Y + $Canvas.Height * 0.66),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.39, $Canvas.Y + $Canvas.Height * 0.50),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.52, $Canvas.Y + $Canvas.Height * 0.47),
    [System.Drawing.PointF]::new($Canvas.X + $Canvas.Width * 0.63, $Canvas.Y + $Canvas.Height * 0.44)
  )

  $stroke.Dispose()
}

function Draw-TorahScrollModern {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size
  )

  $scrollBody = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(241, 224, 189))
  $scrollInner = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(229, 205, 161))
  $scrollShade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(48, 178, 145, 99))
  $rodBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(138, 96, 58))
  $rodEdge = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(104, 72, 43))
  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 98, 67), [Math]::Max(1, [int]($Size * 0.008)))
  $hebrewBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(86, 63, 38))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  # Main parchment panel
  $panelRect = [System.Drawing.RectangleF]::new(
    $Canvas.X + ($Canvas.Width * 0.24),
    $Canvas.Y + ($Canvas.Height * 0.34),
    $Canvas.Width * 0.52,
    $Canvas.Height * 0.43
  )
  $panelPath = New-RoundedRectPath -Rect $panelRect -Radius ($panelRect.Width * 0.12)
  $G.FillPath($scrollBody, $panelPath)

  # Rolled top and bottom edges
  $topRoll = [System.Drawing.RectangleF]::new($panelRect.X, $panelRect.Y - ($panelRect.Height * 0.20), $panelRect.Width, $panelRect.Height * 0.33)
  $bottomRoll = [System.Drawing.RectangleF]::new($panelRect.X, $panelRect.Bottom - ($panelRect.Height * 0.14), $panelRect.Width, $panelRect.Height * 0.32)
  $G.FillEllipse($scrollInner, $topRoll)
  $G.FillEllipse($scrollInner, $bottomRoll)
  $G.FillEllipse($scrollShade, $topRoll.X + ($topRoll.Width * 0.06), $topRoll.Y + ($topRoll.Height * 0.56), $topRoll.Width * 0.88, $topRoll.Height * 0.34)
  $G.FillEllipse($scrollShade, $bottomRoll.X + ($bottomRoll.Width * 0.06), $bottomRoll.Y, $bottomRoll.Width * 0.88, $bottomRoll.Height * 0.30)

  # Wooden rollers
  $rodW = $panelRect.Width * 0.20
  $leftRod = [System.Drawing.RectangleF]::new($panelRect.X - ($rodW * 0.70), $panelRect.Y - ($panelRect.Height * 0.05), $rodW, $panelRect.Height * 1.10)
  $rightRod = [System.Drawing.RectangleF]::new($panelRect.Right - ($rodW * 0.30), $panelRect.Y - ($panelRect.Height * 0.05), $rodW, $panelRect.Height * 1.10)
  $G.FillRectangle($rodBrush, $leftRod)
  $G.FillRectangle($rodBrush, $rightRod)
  $G.FillRectangle($rodEdge, $leftRod.X + ($rodW * 0.70), $leftRod.Y, $rodW * 0.26, $leftRod.Height)
  $G.FillRectangle($rodEdge, $rightRod.X, $rightRod.Y, $rodW * 0.26, $rightRod.Height)

  # Knob caps
  $knobR = $rodW * 0.72
  $G.FillEllipse($rodEdge, $leftRod.X - ($knobR * 0.15), $leftRod.Y - ($knobR * 0.75), $knobR, $knobR)
  $G.FillEllipse($rodEdge, $leftRod.X - ($knobR * 0.15), $leftRod.Bottom - ($knobR * 0.25), $knobR, $knobR)
  $G.FillEllipse($rodEdge, $rightRod.X + ($rodW - $knobR * 0.85), $rightRod.Y - ($knobR * 0.75), $knobR, $knobR)
  $G.FillEllipse($rodEdge, $rightRod.X + ($rodW - $knobR * 0.85), $rightRod.Bottom - ($knobR * 0.25), $knobR, $knobR)

  # Leather tie bands
  $tieBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(126, 80, 45))
  $tieY1 = $panelRect.Y + ($panelRect.Height * 0.25)
  $tieY2 = $panelRect.Y + ($panelRect.Height * 0.74)
  $G.FillRectangle($tieBrush, $panelRect.X + ($panelRect.Width * 0.08), $tieY1, $panelRect.Width * 0.84, [Math]::Max(1, [int]($Size * 0.006)))
  $G.FillRectangle($tieBrush, $panelRect.X + ($panelRect.Width * 0.08), $tieY2, $panelRect.Width * 0.84, [Math]::Max(1, [int]($Size * 0.006)))

  # Hebrew manuscript-style text (right-to-left) for a more authentic Torah look.
  $fontSize = [Math]::Max(6, [int]($Size * 0.042))
  $hebrewFont = New-Object System.Drawing.Font("Times New Roman", $fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $hebrewFormat = New-Object System.Drawing.StringFormat
  $hebrewFormat.Alignment = [System.Drawing.StringAlignment]::Far
  $hebrewFormat.LineAlignment = [System.Drawing.StringAlignment]::Near
  $hebrewFormat.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft

  $scriptRect = [System.Drawing.RectangleF]::new(
    $panelRect.X + ($panelRect.Width * 0.10),
    $panelRect.Y + ($panelRect.Height * 0.29),
    $panelRect.Width * 0.80,
    $panelRect.Height * 0.44
  )

  $hebrewLines = @(
    "בראשית ברא אלהים",
    "את השמים ואת הארץ",
    "ויאמר אלהים יהי אור"
  )

  $lineStep = $scriptRect.Height / 3
  for ($i = 0; $i -lt $hebrewLines.Count; $i++) {
    $lineRect = [System.Drawing.RectangleF]::new($scriptRect.X, $scriptRect.Y + ($lineStep * $i), $scriptRect.Width, $lineStep)
    $G.DrawString($hebrewLines[$i], $hebrewFont, $hebrewBrush, $lineRect, $hebrewFormat)
  }

  # Baseline guides under text to preserve the manuscript row rhythm at small sizes.
  $line1Y = $panelRect.Y + ($panelRect.Height * 0.38)
  $line2Y = $panelRect.Y + ($panelRect.Height * 0.52)
  $line3Y = $panelRect.Y + ($panelRect.Height * 0.66)
  $G.DrawLine($linePen, $panelRect.X + ($panelRect.Width * 0.12), $line1Y, $panelRect.Right - ($panelRect.Width * 0.12), $line1Y)
  $G.DrawLine($linePen, $panelRect.X + ($panelRect.Width * 0.12), $line2Y, $panelRect.Right - ($panelRect.Width * 0.12), $line2Y)
  $G.DrawLine($linePen, $panelRect.X + ($panelRect.Width * 0.12), $line3Y, $panelRect.Right - ($panelRect.Width * 0.12), $line3Y)

  # Subtle parchment wear texture.
  $wearBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 118, 89, 54))
  $G.FillEllipse($wearBrush, $panelRect.X + ($panelRect.Width * 0.18), $panelRect.Y + ($panelRect.Height * 0.44), $panelRect.Width * 0.13, $panelRect.Height * 0.09)
  $G.FillEllipse($wearBrush, $panelRect.X + ($panelRect.Width * 0.70), $panelRect.Y + ($panelRect.Height * 0.56), $panelRect.Width * 0.11, $panelRect.Height * 0.07)

  $panelPath.Dispose()
  $wearBrush.Dispose()
  $hebrewFormat.Dispose()
  $hebrewFont.Dispose()
  $hebrewBrush.Dispose()
  $tieBrush.Dispose()
  $linePen.Dispose()
  $rodEdge.Dispose()
  $rodBrush.Dispose()
  $scrollShade.Dispose()
  $scrollInner.Dispose()
  $scrollBody.Dispose()
}

function Draw-ModernBackdrop {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size,
    [switch]$Maskable
  )

  $corner = if ($Maskable) { $Canvas.Width * 0.18 } else { $Canvas.Width * 0.22 }
  $cardPath = New-RoundedRectPath -Rect $Canvas -Radius $corner

  $baseGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new($Canvas.X, $Canvas.Y),
    [System.Drawing.PointF]::new($Canvas.Right, $Canvas.Bottom),
    [System.Drawing.Color]::FromArgb(43, 85, 129),
    [System.Drawing.Color]::FromArgb(27, 62, 103)
  )
  $G.FillPath($baseGradient, $cardPath)

  # Soft top highlight for a modern app-icon depth effect.
  $highlightRect = [System.Drawing.RectangleF]::new(
    $Canvas.X + ($Canvas.Width * 0.08),
    $Canvas.Y + ($Canvas.Height * 0.07),
    $Canvas.Width * 0.84,
    $Canvas.Height * 0.46
  )
  $highlightPath = New-RoundedRectPath -Rect $highlightRect -Radius ($highlightRect.Width * 0.26)
  $highlightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(36, 173, 215, 255))
  $G.FillPath($highlightBrush, $highlightPath)

  # Subtle border for crispness on light and dark launchers.
  $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(42, 203, 228, 249), [Math]::Max(1, [int]($Size * 0.004)))
  $G.DrawPath($borderPen, $cardPath)

  $borderPen.Dispose()
  $highlightBrush.Dispose()
  $highlightPath.Dispose()
  $baseGradient.Dispose()
  $cardPath.Dispose()
}

function Draw-Variant {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.RectangleF]$Canvas,
    [int]$Size,
    [string]$Style
  )

  switch ($Style) {
    "classic" {
      Draw-StarOfDavid -G $G -Canvas $Canvas -Size $Size -Color ([System.Drawing.Color]::FromArgb(163, 201, 236)) -Scale 0.25 -CenterY 0.58
      Draw-DoveClassic -G $G -Canvas $Canvas -Size $Size
    }
    "crest" {
      Draw-StarOfDavid -G $G -Canvas $Canvas -Size $Size -Color ([System.Drawing.Color]::FromArgb(142, 187, 225)) -Scale 0.235 -CenterY 0.60
      Draw-DoveCrest -G $G -Canvas $Canvas -Size $Size
    }
    "flight" {
      Draw-DoveFlight -G $G -Canvas $Canvas -Size $Size
      Draw-StarOfDavid -G $G -Canvas $Canvas -Size $Size -Color ([System.Drawing.Color]::FromArgb(157, 199, 234)) -Scale 0.23 -CenterY 0.57
    }
    "modern" {
      Draw-TorahScrollModern -G $G -Canvas $Canvas -Size $Size
    }
  }
}

function New-AppIcon {
  param(
    [int]$Size,
    [string]$OutputPath,
    [string]$Style,
    [switch]$Maskable
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = if ($Style -eq "modern") {
    if ($Maskable) { [int]($Size * 0.10) } else { [int]($Size * 0.08) }
  } else {
    if ($Maskable) { [int]($Size * 0.16) } else { [int]($Size * 0.08) }
  }
  $canvas = [System.Drawing.RectangleF]::new($pad, $pad, $Size - (2 * $pad), $Size - (2 * $pad))

  if ($Style -eq "modern") {
    Draw-ModernBackdrop -G $g -Canvas $canvas -Size $Size -Maskable:$Maskable
  } else {
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(44, 84, 119))
    $g.FillEllipse($bgBrush, $canvas)
    $bgBrush.Dispose()
  }

  Draw-Variant -G $g -Canvas $canvas -Size $Size -Style $Style

  $outDir = Split-Path -Parent $OutputPath
  if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  }

  $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose()
  $bmp.Dispose()
}

if ($PreviewOnly) {
  New-AppIcon -Size 512 -Style "classic" -OutputPath "public/icons/previews/icon-512-classic.png"
  New-AppIcon -Size 512 -Style "crest" -OutputPath "public/icons/previews/icon-512-crest.png"
  New-AppIcon -Size 512 -Style "flight" -OutputPath "public/icons/previews/icon-512-flight.png"
  New-AppIcon -Size 512 -Style "modern" -OutputPath "public/icons/previews/icon-512-modern.png"
  exit 0
}

New-AppIcon -Size 192 -Style $Variant -OutputPath "public/icons/icon-192.png"
New-AppIcon -Size 512 -Style $Variant -OutputPath "public/icons/icon-512.png"
New-AppIcon -Size 512 -Style $Variant -OutputPath "public/icons/icon-512-maskable.png" -Maskable
New-AppIcon -Size 180 -Style $Variant -OutputPath "public/icons/apple-touch-icon.png"
