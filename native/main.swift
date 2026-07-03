import AppKit
import ApplicationServices
import AVFoundation
import Carbon.HIToolbox
import Speech

// MARK: - Design tokens (mirrors the web app)

enum Theme {
    static let card = NSColor(srgbRed: 0.071, green: 0.071, blue: 0.078, alpha: 0.96) // #121214
    static let border = NSColor(srgbRed: 0.153, green: 0.153, blue: 0.165, alpha: 1) // neutral-800
    static let textPrimary = NSColor(srgbRed: 0.980, green: 0.980, blue: 0.980, alpha: 1)
    static let textSecondary = NSColor(srgbRed: 0.443, green: 0.443, blue: 0.478, alpha: 1) // #71717A
    static let red = NSColor(srgbRed: 0.937, green: 0.267, blue: 0.267, alpha: 1)
}

// MARK: - Waveform view (monochrome bars, level-driven)

final class WaveformView: NSView {
    private var levels: [CGFloat] = Array(repeating: 0.04, count: 28)

    func push(level: CGFloat) {
        levels.removeFirst()
        levels.append(max(0.04, min(1, level)))
        needsDisplay = true
    }

    func reset() {
        levels = Array(repeating: 0.04, count: levels.count)
        needsDisplay = true
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        let barWidth: CGFloat = 3
        let gap = (bounds.width - CGFloat(levels.count) * barWidth) / CGFloat(levels.count - 1)
        let mid = bounds.midY
        for (i, level) in levels.enumerated() {
            let h = max(3, level * bounds.height)
            let x = CGFloat(i) * (barWidth + gap)
            let falloff = 1 - abs(CGFloat(i) - CGFloat(levels.count) / 2) / (CGFloat(levels.count) / 2)
            ctx.setFillColor(Theme.textPrimary.withAlphaComponent(0.35 + falloff * 0.65).cgColor)
            let rect = CGRect(x: x, y: mid - h / 2, width: barWidth, height: h)
            ctx.addPath(CGPath(roundedRect: rect, cornerWidth: barWidth / 2, cornerHeight: barWidth / 2, transform: nil))
            ctx.fillPath()
        }
    }
}

// MARK: - Floating HUD panel (never takes key focus — target field keeps the cursor)

final class HUDPanel: NSPanel {
    private let waveform = WaveformView()
    private let textLabel = NSTextField(wrappingLabelWithString: "")
    private let dot = NSView()
    private let hintLabel = NSTextField(labelWithString: "⌃⌥Space to finish · text lands in the focused field")

    init() {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 420, height: 118),
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )
        isFloatingPanel = true
        level = .statusBar
        backgroundColor = .clear
        isOpaque = false
        hasShadow = true
        ignoresMouseEvents = true
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        hidesOnDeactivate = false

        let card = NSView()
        card.wantsLayer = true
        card.layer?.backgroundColor = Theme.card.cgColor
        card.layer?.cornerRadius = 16
        card.layer?.borderWidth = 1
        card.layer?.borderColor = Theme.border.cgColor

        dot.wantsLayer = true
        dot.layer?.backgroundColor = Theme.red.cgColor
        dot.layer?.cornerRadius = 4

        textLabel.font = .systemFont(ofSize: 12)
        textLabel.textColor = Theme.textPrimary
        textLabel.maximumNumberOfLines = 2
        textLabel.cell?.truncatesLastVisibleLine = true

        hintLabel.font = .systemFont(ofSize: 9.5)
        hintLabel.textColor = Theme.textSecondary

        for v in [card, waveform, dot, textLabel, hintLabel] {
            v.translatesAutoresizingMaskIntoConstraints = false
        }
        contentView = NSView()
        contentView!.addSubview(card)
        card.addSubview(dot)
        card.addSubview(waveform)
        card.addSubview(textLabel)
        card.addSubview(hintLabel)

        NSLayoutConstraint.activate([
            card.leadingAnchor.constraint(equalTo: contentView!.leadingAnchor, constant: 8),
            card.trailingAnchor.constraint(equalTo: contentView!.trailingAnchor, constant: -8),
            card.topAnchor.constraint(equalTo: contentView!.topAnchor, constant: 8),
            card.bottomAnchor.constraint(equalTo: contentView!.bottomAnchor, constant: -8),

            dot.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            dot.topAnchor.constraint(equalTo: card.topAnchor, constant: 16),
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),

            waveform.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 12),
            waveform.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            waveform.centerYAnchor.constraint(equalTo: dot.centerYAnchor),
            waveform.heightAnchor.constraint(equalToConstant: 26),

            textLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            textLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            textLabel.topAnchor.constraint(equalTo: waveform.bottomAnchor, constant: 8),

            hintLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            hintLabel.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -10),
        ])
        startPulse()
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    private func startPulse() {
        let pulse = CABasicAnimation(keyPath: "opacity")
        pulse.fromValue = 1.0
        pulse.toValue = 0.35
        pulse.duration = 0.6
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        dot.layer?.add(pulse, forKey: "pulse")
    }

    func push(level: CGFloat) { waveform.push(level: level) }

    func set(finalText: String, partial: String) {
        let joined = NSMutableAttributedString()
        let shown = finalText.isEmpty && partial.isEmpty ? "Listening…" : finalText
        joined.append(NSAttributedString(
            string: shown,
            attributes: [.foregroundColor: finalText.isEmpty && partial.isEmpty ? Theme.textSecondary : Theme.textPrimary,
                         .font: NSFont.systemFont(ofSize: 12)]
        ))
        if !partial.isEmpty {
            joined.append(NSAttributedString(
                string: (shown.isEmpty ? "" : " ") + partial,
                attributes: [.foregroundColor: Theme.textSecondary, .font: NSFont.systemFont(ofSize: 12)]
            ))
        }
        textLabel.attributedStringValue = joined
    }

    func present() {
        waveform.reset()
        set(finalText: "", partial: "")
        let screen = NSScreen.screens.first { NSMouseInRect(NSEvent.mouseLocation, $0.frame, false) }
            ?? NSScreen.main
        if let f = screen?.visibleFrame {
            setFrameOrigin(NSPoint(x: f.midX - frame.width / 2, y: f.minY + 96))
        }
        alphaValue = 0
        orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { c in
            c.duration = 0.18
            animator().alphaValue = 1
        }
    }

    func dismiss() {
        NSAnimationContext.runAnimationGroup({ c in
            c.duration = 0.15
            animator().alphaValue = 0
        }, completionHandler: { self.orderOut(nil) })
    }
}

// MARK: - Dictation (AVAudioEngine → SFSpeechRecognizer, partial results)

final class DictationController {
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private(set) var bestTranscript = ""
    var onLevel: ((CGFloat) -> Void)?
    var onText: ((String, String) -> Void)? // (finalized, partial)

    func start(locale: Locale) throws {
        guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable else {
            throw NSError(domain: "WhisperFlow", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Speech recognizer unavailable for \(locale.identifier)"])
        }
        bestTranscript = ""
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.taskHint = .dictation
        request = req

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
            guard let data = buffer.floatChannelData?[0] else { return }
            let n = Int(buffer.frameLength)
            var sum: Float = 0
            for i in 0..<n { sum += data[i] * data[i] }
            let rms = sqrt(sum / Float(max(n, 1)))
            let level = CGFloat(min(1, rms * 9))
            DispatchQueue.main.async { self?.onLevel?(level) }
        }
        engine.prepare()
        try engine.start()

        task = recognizer.recognitionTask(with: req) { [weak self] result, _ in
            guard let self, let result else { return }
            let text = result.bestTranscription.formattedString
            DispatchQueue.main.async {
                self.bestTranscript = text
                if result.isFinal {
                    self.onText?(text, "")
                } else {
                    self.onText?("", text)
                }
            }
        }
    }

    /// Stops capture; recognizer gets a short grace period to finalize, then completion fires with the best text.
    func stop(completion: @escaping (String) -> Void) {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        request?.endAudio()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) { [weak self] in
            guard let self else { return }
            self.task?.cancel()
            self.task = nil
            self.request = nil
            completion(self.bestTranscript.trimmingCharacters(in: .whitespacesAndNewlines))
        }
    }
}

// MARK: - Insert text into whatever field currently has focus

enum TextInserter {
    static func accessibilityTrusted(promptIfNeeded: Bool) -> Bool {
        let opts = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: promptIfNeeded] as CFDictionary
        return AXIsProcessTrustedWithOptions(opts)
    }

    /// Puts text on the pasteboard and synthesizes ⌘V into the frontmost app,
    /// then restores the previous pasteboard string.
    static func insert(_ text: String) {
        let pb = NSPasteboard.general
        let previous = pb.string(forType: .string)
        pb.clearContents()
        pb.setString(text, forType: .string)

        guard accessibilityTrusted(promptIfNeeded: true) else { return } // text stays on clipboard as fallback

        let source = CGEventSource(stateID: .combinedSessionState)
        let down = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: true)
        let up = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: false)
        down?.flags = .maskCommand
        up?.flags = .maskCommand
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            if let previous {
                pb.clearContents()
                pb.setString(previous, forType: .string)
            }
        }
    }
}

// MARK: - App delegate: menu bar item + global hotkey (⌃⌥Space)

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private let hud = HUDPanel()
    private let dictation = DictationController()
    private var hotKeyRef: EventHotKeyRef?
    private var recording = false
    private var toggleMenuItem: NSMenuItem!

    private static let languages: [(id: String, label: String)] = [
        ("en-US", "English (US)"), ("en-GB", "English (UK)"),
        ("fr-FR", "Français"), ("de-DE", "Deutsch"),
        ("es-ES", "Español"), ("ar-SA", "العربية"), ("ja-JP", "日本語"),
    ]
    private var languageID: String {
        get { UserDefaults.standard.string(forKey: "language") ?? "en-US" }
        set { UserDefaults.standard.set(newValue, forKey: "language") }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupStatusItem()
        registerHotKey()
        dictation.onLevel = { [weak self] in self?.hud.push(level: $0) }
        dictation.onText = { [weak self] finalText, partial in self?.hud.set(finalText: finalText, partial: partial) }

        SFSpeechRecognizer.requestAuthorization { _ in }
        AVCaptureDevice.requestAccess(for: .audio) { _ in }
        _ = TextInserter.accessibilityTrusted(promptIfNeeded: true)
    }

    // MARK: status item / menu

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        setIcon(recording: false)

        let menu = NSMenu()
        toggleMenuItem = NSMenuItem(title: "Start Dictation", action: #selector(toggleDictation), keyEquivalent: " ")
        toggleMenuItem.keyEquivalentModifierMask = [.control, .option]
        toggleMenuItem.target = self
        menu.addItem(toggleMenuItem)
        menu.addItem(.separator())

        let langMenu = NSMenu()
        for lang in Self.languages {
            let item = NSMenuItem(title: lang.label, action: #selector(pickLanguage(_:)), keyEquivalent: "")
            item.representedObject = lang.id
            item.target = self
            item.state = lang.id == languageID ? .on : .off
            langMenu.addItem(item)
        }
        let langItem = NSMenuItem(title: "Language", action: nil, keyEquivalent: "")
        langItem.submenu = langMenu
        menu.addItem(langItem)

        let axItem = NSMenuItem(title: "Grant Accessibility…", action: #selector(openAccessibilitySettings), keyEquivalent: "")
        axItem.target = self
        menu.addItem(axItem)
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit Whisper Flow", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        statusItem.menu = menu
    }

    private func setIcon(recording: Bool) {
        let name = recording ? "mic.fill" : "mic"
        let image = NSImage(systemSymbolName: name, accessibilityDescription: "Whisper Flow")
        image?.isTemplate = true
        statusItem.button?.image = image
        statusItem.button?.contentTintColor = recording ? Theme.red : nil
    }

    @objc private func pickLanguage(_ sender: NSMenuItem) {
        guard let id = sender.representedObject as? String else { return }
        languageID = id
        sender.menu?.items.forEach { $0.state = ($0 == sender) ? .on : .off }
    }

    @objc private func openAccessibilitySettings() {
        let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
        NSWorkspace.shared.open(url)
    }

    // MARK: hotkey

    private func registerHotKey() {
        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetEventDispatcherTarget(), { _, _, userData -> OSStatus in
            guard let userData else { return noErr }
            let delegate = Unmanaged<AppDelegate>.fromOpaque(userData).takeUnretainedValue()
            DispatchQueue.main.async { delegate.toggleDictation() }
            return noErr
        }, 1, &eventType, Unmanaged.passUnretained(self).toOpaque(), nil)

        let hotKeyID = EventHotKeyID(signature: OSType(0x57464C57) /* "WFLW" */, id: 1)
        RegisterEventHotKey(
            UInt32(kVK_Space),
            UInt32(controlKey | optionKey),
            hotKeyID,
            GetEventDispatcherTarget(),
            0,
            &hotKeyRef
        )
    }

    // MARK: record / insert

    @objc func toggleDictation() {
        recording ? stopAndInsert() : startDictation()
    }

    private func startDictation() {
        do {
            try dictation.start(locale: Locale(identifier: languageID))
        } catch {
            let alert = NSAlert()
            alert.messageText = "Can't start dictation"
            alert.informativeText = error.localizedDescription + "\n\nCheck microphone & speech permissions in System Settings → Privacy."
            alert.runModal()
            return
        }
        recording = true
        setIcon(recording: true)
        toggleMenuItem.title = "Stop Dictation & Insert"
        hud.present()
    }

    private func stopAndInsert() {
        recording = false
        setIcon(recording: false)
        toggleMenuItem.title = "Start Dictation"
        dictation.stop { [weak self] text in
            self?.hud.dismiss()
            guard !text.isEmpty else { return }
            TextInserter.insert(text)
        }
    }
}

// MARK: - entry point

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory) // menu bar only, no Dock icon
app.run()
