import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let out = root.appendingPathComponent("app-store-assets")
let shotDir = out.appendingPathComponent("iphone-6-5/screenshots")
let previewDir = out.appendingPathComponent("iphone-6-5/previews")
let metaDir = out.appendingPathComponent("metadata")
let iconDir = out.appendingPathComponent("icon")

for dir in [shotDir, previewDir, metaDir, iconDir] {
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
}

let W: CGFloat = 1242
let H: CGFloat = 2688
let scale: CGFloat = 1

extension NSColor {
    convenience init(hex: UInt32) {
        self.init(
            calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: 1
        )
    }
}

struct Palette {
    static let bg = NSColor(hex: 0xF5F7FB)
    static let ink = NSColor(hex: 0x101828)
    static let muted = NSColor(hex: 0x667085)
    static let green = NSColor(hex: 0x008C7A)
    static let cyan = NSColor(hex: 0x009EDB)
    static let violet = NSColor(hex: 0x6F57F5)
    static let coral = NSColor(hex: 0xFF6E4D)
    static let line = NSColor(hex: 0xD7DCE8)
    static let field = NSColor(hex: 0xEEF2F7)
}

func font(_ size: CGFloat, _ weight: NSFont.Weight = .regular) -> NSFont {
    NSFont.systemFont(ofSize: size, weight: weight)
}

func text(_ value: String, x: CGFloat, y: CGFloat, w: CGFloat, size: CGFloat, weight: NSFont.Weight = .regular, color: NSColor = Palette.ink, align: NSTextAlignment = .left, lines: Int = 0) {
    let style = NSMutableParagraphStyle()
    style.alignment = align
    style.lineBreakMode = .byWordWrapping
    style.lineSpacing = size * 0.12
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font(size, weight),
        .foregroundColor: color,
        .paragraphStyle: style
    ]
    let h = lines == 0 ? H : CGFloat(lines) * size * 1.32
    NSString(string: value).draw(with: CGRect(x: x, y: y, width: w, height: h), options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs)
}

func rect(_ r: CGRect, color: NSColor, radius: CGFloat = 0) {
    color.setFill()
    NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius).fill()
}

func stroke(_ r: CGRect, color: NSColor = Palette.line, radius: CGFloat = 0, width: CGFloat = 2) {
    color.setStroke()
    let p = NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius)
    p.lineWidth = width
    p.stroke()
}

func circle(_ r: CGRect, color: NSColor) {
    color.setFill()
    NSBezierPath(ovalIn: r).fill()
}

func gradient(_ r: CGRect, colors: [NSColor], radius: CGFloat = 0, angle: CGFloat = 90) {
    NSGraphicsContext.saveGraphicsState()
    let path = NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius)
    path.addClip()
    NSGradient(colors: colors)?.draw(in: r, angle: angle)
    NSGraphicsContext.restoreGraphicsState()
}

func save(_ image: NSImage, to url: URL) throws {
    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let data = bitmap.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "LivingRelayAssets", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not encode PNG"])
    }
    try data.write(to: url)
}

struct Shot {
    let file: String
    let headline: String
    let subhead: String
    let screen: Screen
}

enum Screen {
    case onboarding
    case login
    case manager
    case triage
    case approvals
    case ownerApproval
    case invoices
    case tenantReport
    case tenantUpdates
    case vendor
}

let shots: [Shot] = [
    Shot(file: "01-create-property.png", headline: "Create a property in minutes", subhead: "Phone verification, role setup, and rental repair rules start in one guided flow.", screen: .onboarding),
    Shot(file: "02-role-login.png", headline: "Every role gets the right view", subhead: "Managers, owners, tenants, and vendors sign in with phone plus PIN.", screen: .login),
    Shot(file: "03-manager-dashboard.png", headline: "See every repair at a glance", subhead: "Open work, approvals, stale items, and invoice totals stay tied to each property.", screen: .manager),
    Shot(file: "04-ai-triage.png", headline: "Turn tenant SMS into work orders", subhead: "LivingRelay classifies trade, severity, estimate, vendor, and access notes.", screen: .triage),
    Shot(file: "05-approval-workflow.png", headline: "Approvals stay moving", subhead: "Manager review, owner approval, vendor text, and invoice records live in one timeline.", screen: .approvals),
    Shot(file: "06-owner-approvals.png", headline: "Owners approve with context", subhead: "Cost, issue, unit, and status are clear before work gets scheduled.", screen: .ownerApproval),
    Shot(file: "07-invoice-tax-bundle.png", headline: "Track paid repairs for taxes", subhead: "Off-platform payments become organized invoice records and annual owner summaries.", screen: .invoices),
    Shot(file: "08-tenant-report.png", headline: "Tenants report issues fast", subhead: "Homes, access notes, photos, and issue details route straight to the manager.", screen: .tenantReport),
    Shot(file: "09-tenant-updates.png", headline: "Tenants see what changed", subhead: "SMS mirrors keep residents informed without exposing manager-only controls.", screen: .tenantUpdates),
    Shot(file: "10-vendor-jobs.png", headline: "Vendors get clean job requests", subhead: "Scope, unit, issue, and accept or decline actions are ready for each repair.", screen: .vendor)
]

func chrome(y: CGFloat, title: String, role: String = "Manager") {
    text("LivingRelay", x: 78, y: y, w: 360, size: 34, weight: .heavy, color: Palette.ink)
    rect(CGRect(x: 880, y: y - 5, width: 250, height: 50), color: NSColor(hex: 0xEEF8F6), radius: 25)
    text(role, x: 900, y: y + 7, w: 210, size: 20, weight: .bold, color: Palette.green, align: .center)
    text(title, x: 78, y: y + 76, w: 800, size: 44, weight: .heavy)
}

func card(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
    rect(CGRect(x: x, y: y, width: w, height: h), color: NSColor.white.withAlphaComponent(0.9), radius: 30)
    stroke(CGRect(x: x, y: y, width: w, height: h), color: NSColor.white, radius: 30, width: 3)
}

func icon(_ x: CGFloat, _ y: CGFloat, label: String, color: NSColor = Palette.green) {
    gradient(CGRect(x: x, y: y, width: 64, height: 64), colors: [color, Palette.violet], radius: 20, angle: 45)
    text(label, x: x, y: y + 12, w: 64, size: 29, weight: .black, color: .white, align: .center, lines: 1)
}

func row(_ y: CGFloat, symbol: String, label: String, value: String, accent: NSColor = Palette.green) {
    card(78, y, 1000, 116)
    circle(CGRect(x: 110, y: y + 28, width: 58, height: 58), color: accent.withAlphaComponent(0.13))
    text(symbol, x: 110, y: y + 41, w: 58, size: 26, weight: .bold, color: accent, align: .center, lines: 1)
    text(label.uppercased(), x: 196, y: y + 28, w: 260, size: 20, weight: .heavy, color: Palette.muted, lines: 1)
    text(value, x: 196, y: y + 58, w: 790, size: 28, weight: .bold, color: Palette.ink, lines: 2)
}

func metric(_ x: CGFloat, _ y: CGFloat, label: String, value: String, symbol: String) {
    card(x, y, 482, 186)
    text(symbol, x: x + 30, y: y + 25, w: 60, size: 34, weight: .heavy, color: Palette.violet, lines: 1)
    text(label, x: x + 30, y: y + 80, w: 250, size: 24, weight: .bold, color: Palette.muted, lines: 1)
    text(value, x: x + 30, y: y + 118, w: 400, size: 46, weight: .heavy, color: Palette.ink, lines: 1)
}

func field(_ y: CGFloat, label: String, value: String, h: CGFloat = 84) {
    rect(CGRect(x: 108, y: y, width: 940, height: h), color: Palette.field, radius: 20)
    text(label, x: 132, y: y + 15, w: 260, size: 22, weight: .bold, color: Palette.muted, lines: 1)
    text(value, x: 132, y: y + 42, w: 860, size: 28, weight: .semibold, color: Palette.ink, lines: max(1, Int(h / 44)))
}

func drawScreen(_ screen: Screen, top: CGFloat) {
    let y = top
    switch screen {
    case .onboarding:
        chrome(y: y, title: "New rental setup", role: "Create property")
        card(78, y + 170, 1000, 780)
        field(y + 215, label: "Property", value: "Noe Valley Duplex")
        field(y + 315, label: "Address", value: "11820 Sanchez St, San Francisco")
        field(y + 415, label: "Manager", value: "Property manager")
        field(y + 515, label: "Phone", value: "Mobile number")
        field(y + 615, label: "PIN", value: "4 digits")
        gradient(CGRect(x: 108, y: y + 730, width: 940, height: 84), colors: [Palette.green, Palette.violet], radius: 42)
        text("Send Code", x: 108, y: y + 752, w: 940, size: 30, weight: .heavy, color: .white, align: .center, lines: 1)
        row(y + 1000, symbol: "SMS", label: "Verification", value: "Create a property with phone verification, then finish setup in the app.", accent: Palette.cyan)
    case .login:
        chrome(y: y, title: "Welcome back", role: "Production")
        card(78, y + 170, 1000, 520)
        field(y + 235, label: "Phone", value: "Mobile number", h: 110)
        field(y + 375, label: "PIN", value: "4 digits", h: 110)
        gradient(CGRect(x: 108, y: y + 545, width: 940, height: 84), colors: [Palette.green, Palette.violet], radius: 42)
        text("Sign in", x: 108, y: y + 567, w: 940, size: 30, weight: .heavy, color: .white, align: .center, lines: 1)
        row(y + 760, symbol: "ROLE", label: "Scoped access", value: "The production API resolves each user as manager, owner, tenant, or vendor.", accent: Palette.violet)
        row(y + 905, symbol: "API", label: "Production", value: "Connected to https://app.livingrelay.com", accent: Palette.green)
    case .manager:
        chrome(y: y, title: "Noe Valley Duplex", role: "Manager")
        metric(78, y + 165, label: "Open", value: "2", symbol: "WO")
        metric(596, y + 165, label: "Approvals", value: "1", symbol: "OK")
        metric(78, y + 380, label: "Stale", value: "0", symbol: "!")
        metric(596, y + 380, label: "2026 invoices", value: "$610", symbol: "$")
        row(y + 635, symbol: "PM", label: "Manager", value: "Assigned property manager")
        row(y + 780, symbol: "OWN", label: "Owner", value: "Assigned property owner")
        row(y + 925, symbol: "R", label: "Rules", value: "Plumbing under $300 goes to Carlos first. Above $150 needs owner approval.")
    case .triage:
        chrome(y: y, title: "AI work order", role: "Manager")
        card(78, y + 165, 1000, 570)
        icon(118, y + 205, label: "W")
        text("WO-2048", x: 205, y: y + 205, w: 260, size: 22, weight: .heavy, color: Palette.coral, lines: 1)
        text("Plumbing - Garden flat", x: 205, y: y + 238, w: 650, size: 42, weight: .heavy, lines: 1)
        rect(CGRect(x: 840, y: y + 215, width: 160, height: 54), color: Palette.coral.withAlphaComponent(0.14), radius: 27)
        text("Urgent", x: 840, y: y + 230, w: 160, size: 22, weight: .heavy, color: Palette.coral, align: .center, lines: 1)
        text("Kitchen sink is leaking under the cabinet. Water is pooling near the baseboard.", x: 118, y: y + 330, w: 900, size: 36, weight: .bold, color: Palette.muted, lines: 3)
        row(y + 780, symbol: "AI", label: "Summary", value: "Plumbing, $325 estimate, suggested Carlos Plumbing", accent: Palette.violet)
        row(y + 925, symbol: "KEY", label: "Access", value: "Tenant home after 4 PM; call before entering.", accent: Palette.green)
    case .approvals:
        chrome(y: y, title: "Repair workflow", role: "Manager")
        row(y + 180, symbol: "1", label: "Manager review", value: "Approve estimate and request owner approval.")
        row(y + 325, symbol: "2", label: "Owner approval", value: "Owner receives context before vendor dispatch.", accent: Palette.violet)
        row(y + 470, symbol: "3", label: "Vendor SMS", value: "Scope and access notes are sent to the preferred vendor.", accent: Palette.cyan)
        row(y + 615, symbol: "4", label: "Invoice", value: "Repair records stay attached to tax year 2026.", accent: Palette.coral)
        gradient(CGRect(x: 78, y: y + 830, width: 1000, height: 94), colors: [Palette.green, Palette.violet], radius: 47)
        text("Approve -> Text vendor -> Create invoice", x: 78, y: y + 858, w: 1000, size: 32, weight: .heavy, color: .white, align: .center, lines: 1)
    case .ownerApproval:
        chrome(y: y, title: "Owner approvals", role: "Owner")
        card(78, y + 170, 1000, 445)
        text("WO-2048 - Garden flat", x: 118, y: y + 220, w: 750, size: 24, weight: .heavy, color: Palette.coral, lines: 1)
        text("$325 Plumbing repair", x: 118, y: y + 265, w: 820, size: 48, weight: .heavy, lines: 1)
        text("Kitchen sink is leaking under the cabinet. Manager approved and requested owner signoff.", x: 118, y: y + 335, w: 860, size: 32, weight: .semibold, color: Palette.muted, lines: 3)
        gradient(CGRect(x: 118, y: y + 500, width: 860, height: 78), colors: [Palette.green, Palette.violet], radius: 39)
        text("Approve by SMS", x: 118, y: y + 520, w: 860, size: 30, weight: .heavy, color: .white, align: .center, lines: 1)
        row(y + 680, symbol: "$", label: "Budget context", value: "Costs and work order history travel with each approval.", accent: Palette.violet)
    case .invoices:
        chrome(y: y, title: "Invoices and taxes", role: "Owner")
        metric(78, y + 165, label: "Tax packet", value: "$610", symbol: "DOC")
        metric(596, y + 165, label: "Paid off platform", value: "2", symbol: "PAID")
        row(y + 420, symbol: "$", label: "Carlos Plumbing", value: "WO-2048 - $325 - Paid off platform")
        row(y + 565, symbol: "$", label: "Spark Right Electric", value: "WO-1882 - $285 - Sent to owner", accent: Palette.violet)
        row(y + 710, symbol: "EXP", label: "Export", value: "Deductible expenses remain organized for 2026 tax records.", accent: Palette.cyan)
    case .tenantReport:
        chrome(y: y, title: "Report an issue", role: "Tenant")
        card(78, y + 170, 1000, 660)
        field(y + 220, label: "Home / space", value: "Garden flat")
        field(y + 320, label: "Issue", value: "Kitchen sink is leaking under the cabinet. Water is pooling near the baseboard.", h: 155)
        field(y + 500, label: "Access", value: "Home after 4 PM. Please call before entering.", h: 125)
        field(y + 650, label: "Photos/videos", value: "sink-leak.mov")
        gradient(CGRect(x: 108, y: y + 750, width: 940, height: 84), colors: [Palette.green, Palette.violet], radius: 42)
        text("Send to manager", x: 108, y: y + 772, w: 940, size: 30, weight: .heavy, color: .white, align: .center, lines: 1)
    case .tenantUpdates:
        chrome(y: y, title: "My updates", role: "Tenant")
        row(y + 190, symbol: "SMS", label: "Manager review", value: "LivingRelay classified this as Plumbing. Manager review is next.", accent: Palette.violet)
        row(y + 335, symbol: "OK", label: "Owner approval", value: "Owner approval requested for $325 estimate.", accent: Palette.green)
        row(y + 480, symbol: "V", label: "Vendor scheduled", value: "Carlos Plumbing received scope and access notes.", accent: Palette.cyan)
        row(y + 625, symbol: "DONE", label: "Closed", value: "Invoice recorded. Payment remains off platform.", accent: Palette.coral)
    case .vendor:
        chrome(y: y, title: "Vendor jobs", role: "Vendor")
        card(78, y + 170, 1000, 400)
        text("WO-2048 - Garden flat", x: 118, y: y + 220, w: 750, size: 24, weight: .heavy, color: Palette.coral, lines: 1)
        text("Plumbing request", x: 118, y: y + 265, w: 820, size: 48, weight: .heavy, lines: 1)
        text("Kitchen sink is leaking under the cabinet. Access after 4 PM; call before entering.", x: 118, y: y + 335, w: 860, size: 32, weight: .semibold, color: Palette.muted, lines: 3)
        gradient(CGRect(x: 118, y: y + 465, width: 400, height: 78), colors: [Palette.green, Palette.violet], radius: 39)
        text("Accept", x: 118, y: y + 485, w: 400, size: 30, weight: .heavy, color: .white, align: .center, lines: 1)
        rect(CGRect(x: 550, y: y + 465, width: 400, height: 78), color: NSColor.white, radius: 39)
        stroke(CGRect(x: 550, y: y + 465, width: 400, height: 78), color: Palette.line, radius: 39, width: 2)
        text("Decline", x: 550, y: y + 485, w: 400, size: 30, weight: .heavy, color: Palette.ink, align: .center, lines: 1)
        row(y + 650, symbol: "SMS", label: "Dispatch", value: "Vendor scope includes unit, issue, estimate, and access notes.", accent: Palette.cyan)
    }
}

func render(_ shot: Shot) -> NSImage {
    let image = NSImage(size: NSSize(width: W, height: H))
    image.lockFocusFlipped(true)
    rect(CGRect(x: 0, y: 0, width: W, height: H), color: Palette.bg)
    gradient(CGRect(x: -120, y: -80, width: W + 240, height: 760), colors: [NSColor(hex: 0xDDF8F4), NSColor(hex: 0xEEE9FF), Palette.bg], radius: 0, angle: 30)
    text(shot.headline, x: 78, y: 130, w: 1086, size: 74, weight: .black, color: Palette.ink, align: .center, lines: 3)
    text(shot.subhead, x: 118, y: 365, w: 1006, size: 34, weight: .semibold, color: Palette.muted, align: .center, lines: 3)
    card(43, 560, 1156, 1885)
    rect(CGRect(x: 78, y: 600, width: 1086, height: 1805), color: Palette.bg, radius: 36)
    drawScreen(shot.screen, top: 660)
    text("LivingRelay", x: 0, y: 2505, w: W, size: 42, weight: .black, color: Palette.green, align: .center, lines: 1)
    image.unlockFocus()
    return image
}

for shot in shots {
    try save(render(shot), to: shotDir.appendingPathComponent(shot.file))
}

func renderIcon() throws {
    let size: CGFloat = 1024
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocusFlipped(true)
    gradient(CGRect(x: 0, y: 0, width: size, height: size), colors: [Palette.green, Palette.violet], radius: 220, angle: 35)
    circle(CGRect(x: 96, y: 96, width: 832, height: 832), color: NSColor.white.withAlphaComponent(0.15))
    rect(CGRect(x: 242, y: 250, width: 540, height: 524), color: NSColor.white.withAlphaComponent(0.92), radius: 150)
    stroke(CGRect(x: 322, y: 340, width: 380, height: 164), color: Palette.green, radius: 82, width: 46)
    stroke(CGRect(x: 322, y: 520, width: 380, height: 164), color: Palette.violet, radius: 82, width: 46)
    text("LR", x: 0, y: 780, w: size, size: 128, weight: .black, color: .white, align: .center, lines: 1)
    image.unlockFocus()
    try save(image, to: iconDir.appendingPathComponent("livingrelay-app-icon-1024.png"))
}

try renderIcon()

let metadata = """
# LivingRelay App Store Submission Metadata

App name: LivingRelay
Subtitle: SMS-first rental repair workflow

Promotional text:
Coordinate rental repairs from tenant SMS through manager approval, owner signoff, vendor dispatch, and invoice records.

Description:
LivingRelay helps property teams keep rental repairs moving without losing context in text threads.

Tenants can report issues from their phone, managers can review triage and dispatch preferred vendors, owners can approve estimates with clear context, and vendors can accept repair requests with the details they need. Invoice records and off-platform payment status stay organized for owner visibility and tax prep.

Built for small property operators, owners, tenants, and service vendors, LivingRelay keeps every repair tied to the property, unit, estimate, access notes, approval history, and communication trail.

Keywords:
property management,rentals,repairs,maintenance,landlord,tenant,vendor,work orders,invoice,SMS

Support URL:
https://livingrelay.com/support

Marketing URL:
https://livingrelay.com/marketing

Privacy Policy URL:
https://livingrelay.com/privacy

Category:
Business

Review notes:
This submission uses the production iOS app target: LivingRelay Production, bundle ID adminstacksort.livingrelay, API https://app.livingrelay.com. Provide Apple Review with a production-safe manager account before submission. Suggested note: "Use the supplied review account to sign in with phone and PIN. The account is scoped to a test property in production and can exercise property setup, tenant repair intake, manager approval, owner approval, vendor coordination, and invoice records. Repair payments are handled off platform." Replace REVIEW_PHONE and REVIEW_PIN with the actual App Review credentials in App Store Connect.

Copyright:
2026 LivingRelay

Screenshot set:
iPhone 6.5-inch portrait, 1242 x 2688 PNG, 10 files in app-store-assets/iphone-6-5/screenshots.

App previews:
Three portrait MP4 previews in app-store-assets/iphone-6-5/previews. Encode previews at 886 x 1920 for iPhone App Store Connect upload.
"""

try metadata.write(to: metaDir.appendingPathComponent("app-store-metadata.md"), atomically: true, encoding: .utf8)
print("Generated \(shots.count) screenshots, metadata, and app icon in \(out.path)")
