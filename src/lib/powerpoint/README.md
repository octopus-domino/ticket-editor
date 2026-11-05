# PowerPoint interchange

This module runs in the browser. It neither uploads presentations nor opens linked resources.

- `package.ts` reads/writes the ZIP package, resolves internal relationships, rejects unsafe
  paths and XML entities, and enforces limits before expanding archive entries.
- `importPptx.ts` reads slide order, layout/master inheritance and group coordinates.
  Separate readers handle images, tables, charts, text and basic shapes. Unsupported details
  produce warnings so the caller can ask the user to review the imported result.
- `exportPptx.ts` writes DrawingML objects and the required presentation/master/theme parts.
  Objects that cannot be represented by supported native shapes are rendered locally to PNG.

## Native round trip

The optional `codoc/source.json` part retains native CoDoc objects. It is trusted only after
schema validation and an exact fingerprint match against all `ppt/` parts. An external edit
invalidates that shortcut: the importer reads the current PowerPoint XML instead of restoring
stale CoDoc content. Do not remove this check when changing the metadata format.

## Units and limits

Canvas coordinates use pixels at 96 DPI. DrawingML uses 9,525 EMU per pixel; font sizes use
hundredths of a point, so one canvas pixel is 75 font-size units. Rotation uses 60,000 units
per degree. These conversions must remain symmetric between import and export.

Current limits are 30 MiB compressed, 100 MiB expanded, 10,000 package entries, 100 slides,
4,096 pixels per page dimension and 2,000 imported objects per slide. Charts use cached
values and the first data series. Group rotation and unsupported custom geometry are
approximated with warnings; animations are not imported.

Run `npm test -- tests/features/powerpoint.test.ts` from `ticket-editor` after changing this
module. The browser guest-editor scenario also checks downloading and reimporting a real PPTX.
