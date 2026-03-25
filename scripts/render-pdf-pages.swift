import Foundation
import PDFKit
import AppKit

enum RenderPagesError: Error, CustomStringConvertible {
  case usage
  case openFailed(String)

  var description: String {
    switch self {
    case .usage:
      return "usage: swift scripts/render-pdf-pages.swift <input.pdf> <outDir> <page1> [page2 ...]"
    case let .openFailed(path):
      return "open failed: \(path)"
    }
  }
}

do {
  try run()
} catch {
  fputs("\(error)\n", stderr)
  exit(1)
}

func run() throws {
  let args = CommandLine.arguments
  guard args.count >= 4 else {
    throw RenderPagesError.usage
  }

  let inputPath = args[1]
  let outDir = URL(fileURLWithPath: args[2], isDirectory: true)
  let pages = args.dropFirst(3).compactMap(Int.init)

  guard let doc = PDFDocument(url: URL(fileURLWithPath: inputPath)) else {
    throw RenderPagesError.openFailed(inputPath)
  }

  try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

  for oneBased in pages {
    let index = oneBased - 1
    guard let page = doc.page(at: index) else { continue }
    let rect = page.bounds(for: .mediaBox)
    let scale: CGFloat = 1.6
    let size = NSSize(width: rect.width * scale, height: rect.height * scale)
    let image = NSImage(size: size)
    image.lockFocus()
    NSColor.white.setFill()
    NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()
    guard let ctx = NSGraphicsContext.current?.cgContext else {
      image.unlockFocus()
      continue
    }
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    image.unlockFocus()

    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
      continue
    }

    let file = outDir.appendingPathComponent(String(format: "page-%02d.png", oneBased))
    try png.write(to: file)
    print(file.path)
  }
}
