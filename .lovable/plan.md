

# Fix rotation handle — coordinate system mismatch

## Problem

The rotation handle doesn't work because mouse coordinates and center coordinates are in different spaces. The `onMouseDown` stores center in SVG viewBox coords (`cx`, `cy`), but `atan2` uses screen pixel coords mixed with those SVG coords. During `mousemove` (line 468-470), it scales by zoom but ignores pan offset, making the angle calculation wrong.

## Solution

Use SVG coordinates consistently throughout the rotation flow:

### `LotCanvas.tsx` changes

**1. onMouseDown (both lot handle ~line 1232 and road handle ~line 990):**
- Use `getSvgPos(e)` to get the mouse position in SVG viewBox space
- Store `centerX`/`centerY` in SVG coords (already correct)
- Compute `startAngle` using SVG coords: `atan2(svgMouse.y - cy, svgMouse.x - cx)`

**2. handleCanvasMouseMove rotation block (~line 463-493):**
- Use `getSvgPos(e)` to convert current mouse to SVG coords
- Compute `currentAngle = atan2(svgMouse.y - rotationDrag.centerY, svgMouse.x - rotationDrag.centerX)`
- Remove the broken `rect.height / CANVAS_H * zoom` scaling

**3. Add cumulative angle tracking:**
- Change `rotationDrag` state to also store `cumulativeAngle` (total rotation since drag start)
- Store original vertices at drag start to avoid floating-point drift from incremental rotations
- On each move, apply full cumulative rotation from original vertices instead of incremental delta

This ensures rotation works in all directions regardless of zoom/pan state, and eliminates precision loss from repeated small rotations.

## Files

| File | Change |
|------|--------|
| `LotCanvas.tsx` | Fix coordinate system in rotation onMouseDown + mousemove, add cumulative rotation with original vertices |

