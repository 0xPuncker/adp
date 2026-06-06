---
description: iOS 26 Liquid Glass - Performance optimization and best practices guide
---

# Liquid Glass - iOS 26 Performance & Best Practices

## Overview

Liquid Glass is Apple's unified design language introduced in iOS 26 (WWDC 2025). It combines optical properties of glass with fluidity, featuring blur, reflection, and morphing capabilities. However, improper usage causes severe performance issues (13% battery drain vs 1% in iOS 18).

## Golden Rule

> **"Liquid Glass is exclusively for the navigation layer that floats above the content of your app."**

Apple's design philosophy: Content sits at the bottom, glass controls float on top.

---

## When to Use vs Avoid

### ✅ Use Liquid Glass For (Navigation Layer)

- **Toolbars, TabBars, Sidebars** - System navigation components
- **Floating action buttons** - Controls that float above content
- **Sheets, popovers, menus** - Modal/presented controls
- **Context-sensitive controls** - Navigation layer elements
- **System-level alerts** - Native alert presentations

### ❌ Never Use Liquid Glass For (Content Layer)

- **Content layer** - Lists, cards, tables, grids
- **Full-screen backgrounds** - Background gradients or images
- **Scrollable content** - Any scrollable view with glass
- **Stacked glass layers** - Multiple glass elements overlapping
- **Every UI element** - Don't apply glass indiscriminately

### Example Comparison

```swift
// ❌ WRONG - Glass on content
List {
    ForEach(items) { item in
        Text(item.name)
            .glassEffect() // DON'T!
    }
}

// ✅ CORRECT - Glass only on floating controls
ZStack {
    List { /* content without glass */ }
    VStack {
        Spacer()
        FloatingButton()
            .glassEffect(.regular.interactive())
    }
}
```

---

## Performance Optimization: GlassEffectContainer

### Why It's Critical

Without `GlassEffectContainer`, each glass element samples independently:
- **Inconsistent appearance** - Each element calculates blur/lighting separately
- **Multiple render passes** - GPU renders each shader instance separately
- **High memory usage** - Each element allocates its own sampling region
- **No morphing** - Elements don't blend together smoothly

### GlassEffectContainer Benefits

1. **Shared sampling region** - Consistent blur/lighting across all elements
2. **Single render pass** - GPU renders glass once for entire container
3. **Enables morphing** - Fluid transitions between grouped elements
4. **Automatic grouping** - Elements blend when within spacing threshold
5. **Memory efficient** - One shared sampling region instead of many

### Usage Pattern

```swift
// ❌ WRONG - Without container
HStack(spacing: 16) {
    Button("Edit").glassEffect()
    Button("Share").glassEffect()
    Button("Delete").glassEffect()
}
// Each samples independently = inconsistent + expensive

// ✅ CORRECT - With GlassEffectContainer
GlassEffectContainer(spacing: 30) {
    HStack(spacing: 16) {
        Button("Edit").glassEffect()
        Button("Share").glassEffect()
        Button("Delete").glassEffect()
    }
}
// Shared sampling region = consistent + performant
```

### Spacing Parameter

The `spacing` parameter controls the morphing threshold:

```swift
GlassEffectContainer(spacing: 30) {
    // Elements within 30 points will visually blend and morph together
    HStack(spacing: 20) {
        Button("A").glassEffect()
        Button("B").glassEffect()
    }
}
```

- **Smaller spacing** - Elements morph only when very close
- **Larger spacing** - Elements morph from farther apart
- **Default spacing** - System default (~20-30 points)

---

## Never Stack Glass on Glass

From Apple WWDC 2025:
> "Always avoid glass on glass. Stacking Liquid Glass elements can quickly make the interface feel cluttered."

**Why?** Glass cannot properly sample other glass - it samples the content BEHIND it, not other glass layers.

```swift
// ❌ WRONG - Glass on glass
VStack {
    HeaderView().glassEffect()
    ContentView().glassEffect() // Glass on glass!
}

// ✅ CORRECT - Single glass layer
ZStack {
    ContentView() // No glass
    FloatingControls().glassEffect() // Single layer
}
```

---

## Glass Variants

### Regular (Default) - Use for Most Cases

```swift
.glassEffect(.regular)
```

- Standard blur and lighting
- Works for most navigation controls
- Balanced performance/visuals

### Clear - Only When ALL Three Conditions Met

1. **Background is simple** - Solid color or simple gradient
2. **No text readability issues** - High contrast maintained
3. **Performance critical** - Need maximum optimization

```swift
.glassEffect(.clear)
```

- Reduced blur effect
- Better performance
- Can cause readability issues on complex backgrounds

### Interactive (iOS Only)

```swift
.glassEffect(.regular.interactive())
```

- Adds morphing on touch/press
- Use for buttons that need tactile feedback
- Slightly higher performance cost

**Never Mix Variants** - Don't use regular and clear in the same container.

---

## Button Styles

### Glass Button Style

```swift
Button("Action") { }
    .buttonStyle(.glass)
```

- Automatic glass effect
- Built-in morphing
- Use for standard navigation buttons

### Glass Prominent Button Style

```swift
Button("Primary Action") { }
    .buttonStyle(.glassProminent)
```

- More prominent glass effect
- Use for primary actions
- Higher visual weight

### Adaptive Pattern (iOS 26 + iOS 18 Fallback)

```swift
Button("Action") { }
    .adaptiveGlassButtonStyle(prominent: false)
```

- iOS 26: Uses Liquid Glass
- iOS 18: Falls back to bordered button
- Ensures cross-version compatibility

---

## Morphing Transitions

### glassEffectID for Morphing

```swift
@Namespace private var transition

Button("Edit") { }
    .glassEffect()
    .glassEffectID("edit", in: transition)

Button("Delete") { }
    .glassEffect()
    .glassEffectID("delete", in: transition)
```

- Enables smooth morphing between states
- Requires namespace for coordination
- Works with GlassEffectContainer

### glassEffectTransition

```swift
.glassEffectTransition(.materialize)
```

Options:
- `.identity` - No transition
- `.matchedGeometry` - Matched geometry transition (default)
- `.materialize` - Material appearance transition

---

## glassEffectUnion for Distant Elements

When glass elements are too far apart to automatically blend:

```swift
@Namespace private var controls

GlassEffectContainer {
    VStack(spacing: 0) {
        Button("Edit") { }
            .buttonStyle(.glass)
            .glassEffectUnion(id: "tools", namespace: controls)
        
        Spacer().frame(height: 100) // Large gap
        
        Button("Delete") { }
            .buttonStyle(.glass)
            .glassEffectUnion(id: "tools", namespace: controls)
    }
}
```

- Manually combines glass effects
- Elements must share same ID
- Elements must use same glass type
- Similar shapes work best

---

## Performance Best Practices

### 1. Limit Continuous Animations

```swift
// ❌ BAD - Continuous animation on glass
Circle()
    .glassEffect()
    .rotationEffect(.degrees(isAnimating ? 360 : 0))
    .animation(.linear(duration: 1).repeatForever(while: isAnimating), value: isAnimating)

// ✅ GOOD - Let glass rest in steady states
Circle()
    .glassEffect()
    .rotationEffect(.degrees(angle))
    .animation(.spring(), value: angle)
```

### 2. Test on Older Devices

- Profile on 3-year-old devices
- Use Instruments to measure GPU/CPU
- Monitor battery drain
- Check for frame drops

### 3. Profile with Instruments

Key metrics to monitor:
- **GPU utilization** - Should stay under 60%
- **Memory footprint** - Watch for leaks with glass
- **Frame rate** - Maintain 60fps during interactions
- **Battery impact** - Compare glass vs non-glass versions

### 4. Reduce Glass Count

```swift
// ❌ BAD - Too many glass elements
ForEach(0..<50) { _ in
    Button("Item").glassEffect()
}

// ✅ GOOD - Fewer glass elements, or use GlassEffectContainer
GlassEffectContainer {
    ForEach(0..<10) { _ in
        Button("Item").glassEffect()
    }
}
```

---

## Accessibility

### System Features (Automatic)

Liquid Glass automatically respects:
- **Reduced Transparency** - Disables blur effects
- **Increased Contrast** - Adjusts opacity
- **Reduced Motion** - Disables morphing animations
- **iOS 26.1+ Tinted Mode** - Applies tint override

### Developer Responsibilities

```swift
// ✅ DO - Test with accessibility modes
- [ ] Reduced Transparency enabled
- [ ] Increased Contrast enabled
- [ ] Reduce Motion enabled
- [ ] Tinted mode in iOS 26.1+
- [ ] VoiceOver navigation
- [ ] Dynamic Type sizes
- [ ] Color blindness simulators
- [ ] Bright sunlight conditions

// ❌ DON'T - Override system settings
// Never force glass when user has disabled transparency
```

### Maintain Contrast

- **Minimum 4.5:1 contrast ratio** for text on glass
- **Test legibility** across all backgrounds
- **Use vibrant text** on glass for better readability
- **Add subtle borders** for edge definition when needed

---

## Tinting Guidelines

### Use Tinting Selectively

```swift
// ✅ GOOD - Tint for primary actions
Button("Primary Action") { }
    .glassEffect(.regular.tint(.blue))

// ❌ BAD - Tint everything
Button("Secondary").glassEffect(.regular.tint(.red))
Button("Tertiary").glassEffect(.regular.tint(.green))
```

### Tinting Philosophy

- **Tint conveys meaning**, not decoration
- **Use for primary actions** only
- **Avoid tinting everything** - causes visual noise
- **Compatible with all glass behaviors**

---

## Platform Differences

### iOS 26

- Full Liquid Glass support
- `glassEffect()` modifier available
- GlassEffectContainer available
- Interactive morphing supported

### iOS 18 (Fallback)

```swift
// Use adaptive patterns for cross-version support
.adaptiveGlass(in: Capsule())
.adaptiveGlassButtonStyle()
```

- Falls back to Material blur
- No morphing transitions
- Manual styling required

### macOS Tahoe

- `UIGlassEffect` for UIKit
- Automatic toolbar grouping
- Sidebar ambient reflection
- Similar principles, different APIs

---

## Known Issues & Workarounds

### Issue 1: Interactive Shape Mismatch

**Problem**: `.glassEffect(.regular.interactive(), in: RoundedRectangle())` responds with Capsule shape

**Status**: Known beta issue

**Workaround**:
```swift
// ❌ DON'T
.glassEffect(.regular.interactive(), in: RoundedRectangle())

// ✅ DO
.buttonStyle(.glass) // Use button style instead
```

### Issue 2: glassProminent Circle Artifacts

**Problem**: Rendering artifacts with `.glassProminent` and `.circle`

**Workaround**:
```swift
Button("Action") { }
    .buttonStyle(.glassProminent)
    .buttonBorderShape(.circle)
    .clipShape(Circle()) // Fixes artifacts
```

### Issue 3: Widget Backgrounds

**Problem**: Widgets show black background in Standard/Dark modes

**Status**: No complete solution yet

**Partial Solution**:
```swift
// Tinted and Transparent modes work with Color.clear
Color.clear
```

---

## Quick Reference: Do's and Don'ts

### ✅ DO

- Use glass for navigation layer only
- Use GlassEffectContainer for multiple elements
- Test on older devices
- Profile with Instruments
- Maintain 4.5:1 contrast ratio
- Test with accessibility modes
- Let glass rest in steady states
- Use spacing parameter effectively
- Use adaptive patterns for iOS 18 fallback
- Limit continuous animations

### ❌ DON'T

- Use glass on content layer (lists, cards, tables)
- Stack glass on glass
- Use glass without container for multiple elements
- Override system accessibility settings
- Tint everything indiscriminately
- Use glass on full-screen backgrounds
- Mix glass variants in same container
- Ignore performance on older devices
- Use glass on scrollable content
- Apply glass to every UI element

---

## API Quick Reference

### Core Modifiers

```swift
.glassEffect(_ style: Glass = .regular, in shape: some Shape)
.glassEffectID<ID: Hashable>(_ id: ID, in namespace: Namespace.ID)
.glassEffectUnion<ID: Hashable>(id: ID, namespace: Namespace.ID)
.glassEffectTransition(_ transition: GlassEffectTransition, isEnabled: Bool = true)
```

### Container

```swift
GlassEffectContainer(spacing: CGFloat = 20) { content }
```

### Button Styles

```swift
.buttonStyle(.glass)
.buttonStyle(.glassProminent)
.adaptiveGlassButtonStyle(prominent: Bool = false)
```

### Adaptive Helpers

```swift
.adaptiveGlass(in: some Shape, tint: Color? = nil, material: Material = .ultraThinMaterial)
.adaptiveGlassButtonStyle(prominent: Bool = false)
.hideScrollEdgeBlur(for edges: Edge.Set = .top)
```

---

## Common Patterns

### Pattern 1: Floating Action Button

```swift
ZStack {
    ScrollView { /* content */ }
    
    VStack {
        Spacer()
        HStack {
            Spacer()
            Button("Add") { }
                .glassEffect(.regular.interactive())
                .frame(width: 56, height: 56)
                .clipShape(Circle())
        }
        .padding()
    }
}
```

### Pattern 2: Custom Toolbar

```swift
GlassEffectContainer(spacing: 16) {
    HStack(spacing: 12) {
        Button("Edit") { }.buttonStyle(.glass)
        Button("Share") { }.buttonStyle(.glass)
        Button("Delete") { }.buttonStyle(.glass)
    }
    .padding()
}
.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
```

### Pattern 3: Sheet with Glass

```swift
.sheet(isPresented: $showSheet) {
    SheetContent()
        .presentationDetents([.medium, .large])
        // iOS 26: automatic glass background
        // iOS 18: use .presentationBackground(Material)
}
```

### Pattern 4: Morphing Button Group

```swift
@Namespace private var buttonGroup

GlassEffectContainer {
    HStack(spacing: 8) {
        ForEach(0..<3) { index in
            Button("Option \(index)") { }
                .glassEffect()
                .glassEffectID("button-\(index)", in: buttonGroup)
        }
    }
}
```

---

## Performance Impact Summary

### Documented Impact (iPhone 16 Pro Max testing)

- **iOS 26 with Liquid Glass**: 13% battery drain
- **iOS 18 without Liquid Glass**: 1% battery drain
- **Increased heat generation** on continuous use
- **Higher CPU/GPU load** on older devices (3+ years)

### Optimization Strategies

1. **GlassEffectContainer** - Single render pass for multiple elements
2. **Limit animations** - Let glass rest in steady states
3. **Reduce element count** - Fewer glass elements = better performance
4. **Profile continuously** - Use Instruments throughout development
5. **Test on target devices** - Older devices reveal performance issues

---

## Conclusion

Liquid Glass is a powerful design system when used correctly. The key is to:

1. **Respect the golden rule** - Navigation layer only
2. **Use GlassEffectContainer** - For multiple elements
3. **Avoid glass on content** - Lists, cards, tables
4. **Never stack glass** - Single layer only
5. **Profile continuously** - Monitor performance
6. **Test accessibility** - Ensure everyone can use it

When in doubt, remember: **Glass floats above content, it doesn't become content.**
