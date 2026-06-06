---
name: metal-shader
description: >-
  Reference for Metal shader optimization and particle animation in iOS. Trigger when
  implementing GPU-accelerated visual effects, particle systems (dot wave pulse, ripple),
  Metal shaders with SwiftUI, optimizing shader performance, or choosing between
  Canvas+Metal, MTKView+Compute Shaders, and Metal Performance Shaders approaches.
---

# Metal Shader Optimization & Particle Animation

Implement high-performance GPU-accelerated visual effects and particle systems in iOS using Metal shaders. Covers optimization patterns, SwiftUI integration, and modern iOS 18/26 features.

## Contents

- [Triage Workflow](#triage-workflow)
- [DotWave Pattern](#dotwave-pattern)
- [TCA Integration](#tca-integration)
- [Metal Shader Optimization](#metal-shader-optimization)
- [iOS 18 Features](#ios-18-features)
- [iOS 26 Features (Metal 4)](#ios-26-features-metal-4)
- [Particle Animation Approaches](#particle-animation-approaches)
- [X/Twitter Example Patterns](#xtwitter-example-patterns)
- [Performance Checklist](#performance-checklist)
- [Common Mistakes](#common-mistakes)
- [References](#references)

## Triage Workflow

### Step 1: Choose the approach

| Approach | Particle Count | Complexity | When to use |
|---|---|---|---|
| SwiftUI Canvas + Metal Shader | 1,000-2,000 | Low | 2D grid effects, wave patterns, UI effects |
| MTKView + Compute Shaders | 10,000+ | High | Complex particle systems, physics simulations |
| Metal Performance Shaders | N/A (GPU kernels) | Medium | Standard effects (blur, threshold, custom kernels) |
| SwiftUI TimelineView + Shader | 1,000-2,000 | Low | Animated shaders, time-based effects |

### Step 2: Select iOS version features

| Feature | iOS Version | Use case |
|---|---|---|
| `[[stitchable]]` shaders | iOS 17+ | SwiftUI layerEffect integration |
| Shader `compile()` | iOS 18+ | Device-specific shader pre-compilation |
| Metal 4 unified encoder | iOS 26+ | Better hardware utilization, ML integration |
| Liquid Glass UI | iOS 26+ | Hardware-accelerated translucency (40% GPU reduction) |

### Step 3: Apply optimization patterns

- Use `half` precision for colors and most calculations
- Leverage function constants to eliminate branches
- Use TimelineView for smooth 60fps animation
- Pre-compile shaders in iOS 18+
- Monitor GPU usage with Xcode Metal debugger

## DotWave Pattern

The DotWave pattern (from [radiofun/DotWave](https://github.com/radiofun/DotWave)) is a reference implementation for 2D grid-based wave effects using SwiftUI Canvas and Metal shaders.

### Architecture

- SwiftUI Canvas with 30×30 dot grid (900 dots at 10pt spacing)
- Metal shader with `[[stitchable]]` attribute
- `layerEffect` modifier applies shader to view
- tanh-based wavefronts radiating from center point
- Value noise perturbation with bicubic interpolation
- Drag gesture repositions ripple center in real-time
- Time parameter drives wave propagation

### Metal Shader Implementation

```metal
// DotWave.metal
#include <metal_stdlib>
using namespace metal;

[[ stitchable ]]
half4 dotwave(
    float2 position,
    half4 currentColor,
    float time,
    float2 center,
    float frequency,
    float speed
) {
    // Calculate distance from center
    float distance = length(position - center);
    
    // Tanh-based wavefront
    float wave = tanh(distance * frequency - time * speed);
    
    // Value noise perturbation
    float noise = fract(sin(dot(position + time, float2(12.9898, 78.233))) * 43758.5453);
    
    // Apply displacement
    float displacement = wave * noise;
    
    // Return color with displacement
    return half4(displacement, displacement, displacement, 1.0) * currentColor.a;
}
```

### SwiftUI Integration

```swift
struct DotGrid: View {
    @State private var time: Float = 0
    @State private var center: CGPoint = .zero
    let startDate = Date()
    
    var body: some View {
        TimelineView(.animation) { context in
            let elapsedTime = Float(startDate.timeIntervalSince(context.date))
            
            Canvas { context, size in
                // Draw 30x30 dot grid
                for row in 0..<30 {
                    for col in 0..<30 {
                        let x = CGFloat(col) * 10 + 5
                        let y = CGFloat(row) * 10 + 5
                        let dot = Path(ellipseIn: CGRect(x: x, y: y, width: 8, height: 8))
                        context.fill(dot, with: .color(.blue))
                    }
                }
            }
            .layerEffect(
                ShaderLibrary.dotwave(
                    .float(elapsedTime),
                    .float2(center),
                    .float(0.1),
                    .float(2.0)
                )
            )
            .gesture(
                DragGesture()
                    .onChanged { value in
                        center = value.location
                    }
            )
        }
    }
}
```

### Requirements

- Xcode 15+
- iOS 17+ / macOS 14+ (requires SwiftUI Metal shader support)

## TCA Integration

Integrate Metal shaders with The Composable Architecture (TCA) following the loter-ios project patterns (Swift 6, TCA 1.25.5, @MainActor enums).

### Feature Structure

```swift
@MainActor
enum DotWaveEffect {
    @ObservableState
    @CasePathable
    @dynamicMemberLookup
    struct State: Equatable, Sendable {
        var shaderTime: Float = 0
        var rippleCenter: CGPoint = .zero
        var frequency: Float = 0.1
        var speed: Float = 2.0
        var isAnimating: Bool = true
        
        // Computed properties for shader parameters
        var shaderParameters: (time: Float, center: SIMD2<Float>, frequency: Float, speed: Float) {
            (
                time: shaderTime,
                center: SIMD2<Float>(Float(rippleCenter.x), Float(rippleCenter.y)),
                frequency: frequency,
                speed: speed
            )
        }
    }
    
    @CasePathable
    enum Action: ViewAction, BindableAction, Sendable {
        case view(View)
        case binding(BindingAction<State>)
        
        enum View {
            case startAnimation
            case stopAnimation
            case didDrag(CGPoint)
            case updateFrequency(Float)
            case updateSpeed(Float)
        }
    }
    
    @Reducer
    struct Feature {
        @Dependency(\.continuousClock) var clock
        
        var body: some ReducerOf<Self> {
            BindingReducer()
            Reduce { state, action in
                switch action {
                case .view(.startAnimation):
                    state.isAnimating = true
                    return .run { send in
                        for await _ in clock.timer(interval: .milliseconds(16)) {
                            await send(.view(.tick))
                        }
                    }
                    
                case .view(.stopAnimation):
                    state.isAnimating = false
                    return .none
                    
                case .view(.didDrag(let location)):
                    state.rippleCenter = location
                    return .none
                    
                case .view(.updateFrequency(let value)):
                    state.frequency = value
                    return .none
                    
                case .view(.updateSpeed(let value)):
                    state.speed = value
                    return .none
                    
                case .binding:
                    return .none
                }
            }
        }
    }
}
```

### View Integration

```swift
@MainActor
extension DotWaveEffect {
    struct ContentView: View {
        @Bindable var store: StoreOf<Feature>
        
        var body: some View {
            TimelineView(.animation) { context in
                let params = store.shaderParameters
                
                Circle()
                    .fill(Color.blue)
                    .frame(width: 200, height: 200)
                    .layerEffect(
                        ShaderLibrary.dotwave(
                            .float(params.time),
                            .float2(params.center),
                            .float(params.frequency),
                            .float(params.speed)
                        )
                    )
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                store.send(.view(.didDrag(value.location)))
                            }
                    )
            }
            .onAppear {
                store.send(.view(.startAnimation))
            }
        }
    }
}
```

### Animation Time Management

Use `@Dependency(\.continuousClock)` for frame-based animation updates:

```swift
@Reducer
struct Feature {
    @Dependency(\.continuousClock) var clock
    
    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .view(.startAnimation):
                return .run { send in
                    // 60 FPS = ~16.67ms
                    for await _ in clock.timer(interval: .milliseconds(16)) {
                        await send(.view(.tick))
                    }
                }
                
            case .view(.tick):
                state.shaderTime += 0.016 // Increment by frame time
                return .none
                
            default:
                return .none
            }
        }
    }
}
```

### Gesture-Driven Shader Parameters

Map SwiftUI gestures to TCA actions:

```swift
@MainActor
extension DotWaveEffect {
    struct ContentView: View {
        @Bindable var store: StoreOf<Feature>
        
        var body: some View {
            ZStack {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 200, height: 200)
                    .layerEffect(
                        ShaderLibrary.dotwave(
                            .float(store.shaderTime),
                            .float2(store.rippleCenter),
                            .float(store.frequency),
                            .float(store.speed)
                        )
                    )
                
                // Gesture controls
                VStack {
                    Slider(value: $store.frequency, in: 0.01...0.5)
                        .onChange(of: store.frequency) { _, newValue in
                            store.send(.view(.updateFrequency(newValue)))
                        }
                    
                    Slider(value: $store.speed, in: 0.5...5.0)
                        .onChange(of: store.speed) { _, newValue in
                            store.send(.view(.updateSpeed(newValue)))
                        }
                }
                .padding()
            }
            .gesture(
                DragGesture()
                    .onChanged { value in
                        store.send(.view(.didDrag(value.location)))
                    }
            )
        }
    }
}
```

### Delegate Actions for Shader Events

Use delegate actions to communicate shader events to parent features:

```swift
@MainActor
enum DotWaveEffect {
    @CasePathable
    enum Action: ViewAction, BindableAction, Sendable {
        case view(View)
        case binding(BindingAction<State>)
        case delegate(Delegate)
        
        enum Delegate {
            case animationDidStart
            case animationDidStop
            case rippleDidTrigger(at: CGPoint)
        }
    }
    
    @Reducer
    struct Feature {
        var body: some ReducerOf<Self> {
            Reduce { state, action in
                switch action {
                case .view(.startAnimation):
                    state.isAnimating = true
                    return .send(.delegate(.animationDidStart))
                    
                case .view(.stopAnimation):
                    state.isAnimating = false
                    return .send(.delegate(.animationDidStop))
                    
                case .view(.didDrag(let location)):
                    state.rippleCenter = location
                    return .send(.delegate(.rippleDidTrigger(at: location)))
                    
                case .delegate:
                    return .none
                    
                default:
                    return .none
                }
            }
        }
    }
}
```

### Parent Feature Integration

Use `.ifLet` to present the shader feature:

```swift
@MainActor
enum ParentFeature {
    @ObservableState
    struct State: Equatable, Sendable {
        @Presents var dotWave: DotWaveEffect.State?
    }
    
    enum Action {
        case dotWave(PresentationAction<DotWaveEffect.Action>)
        case showDotWave
    }
    
    @Reducer
    struct Feature {
        var body: some ReducerOf<Self> {
            Reduce { state, action in
                switch action {
                case .showDotWave:
                    state.dotWave = DotWaveEffect.State()
                    return .none
                    
                case .dotWave:
                    return .none
                }
            }
            .ifLet(\.$dotWave, action: \.dotWave) {
                DotWaveEffect.Feature()
            }
        }
    }
}
```

### Dependency Injection for Shader Services

Create a shader service dependency for complex operations:

```swift
@MainActor
enum ShaderService {
    @DependencyClient
    struct Client: Sendable {
        var compileShader: @Sendable (String) async throws -> CompiledShader
        var precompileForDevice: @Sendable () async throws -> Void
    }
}

extension ShaderService.Client: DependencyKey {
    static let liveValue = ShaderService.Client(
        compileShader: { shaderName in
            try await withTaskCancellationHandler {
                // Compile shader logic
            } onCancel: {
                // Clean up
            }
        },
        precompileForDevice: {
            try await withTaskCancellationHandler {
                // Precompile for current device
            } onCancel: {
                // Clean up
            }
        }
    )
}

extension DependencyValues {
    var shaderService: ShaderService.Client {
        get { self[ShaderService.Client.self] }
        set { self[ShaderService.Client.self] = newValue }
    }
}
```

Use in reducer:

```swift
@Reducer
struct Feature {
    @Dependency(\.shaderService) var shaderService
    
    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .view(.preloadShader):
                return .run { send in
                    try await shaderService.precompileForDevice()
                }
                
            default:
                return .none
            }
        }
    }
}
```

## Metal Shader Optimization

### Data Type Optimization

**Prefer `half` precision over `float` when possible**

GPU is heavily optimized for half-precision operations, especially on iOS. This saves register space and increases shader occupancy.

```metal
// GOOD — use half for colors and most calculations
half4 color = half4(1.0h, 0.5h, 0.0h, 1.0h);
half intensity = 0.5h;

// AVOID — float only for position/depth when needed
float3 position = float3(1.0, 2.0, 3.0);
float depth = calculateDepth(position);
```

**Use correct type literals to avoid runtime conversions**

```metal
// BAD — implicit int-to-float conversion
float y = (x - 1) / 2;

// GOOD — explicit float literals
float y = (x - 1.0) / 2.0;

// Type literal suffixes:
// float: 0.5, 0.5f, or 0.5F
// half: 0.5h or 0.5H
// int: 42
// uint: 42u or 42U
```

**Type conversion is free between half and float**

```metal
// Conversion between half and float is free — no performance cost
half4 color = half4(floatValue);
float3 position = float3(halfValue);
```

### Memory Management

**Use constants in constant address space**

```metal
// GOOD — constants in constant address space
constant float3 lightPositions[4] = { /* ... */ };

// AVOID — regular arrays for constants
float3 lightPositions[4] = { /* ... */ };
```

**Leverage `.storageModeShared` for buffers**

```swift
// Swift side
let buffer = device.makeBuffer(
    length: particleData.count * MemoryLayout<Particle>.stride,
    options: .storageModeShared
)
```

**Utilize tile memory (TBDR free reads on Apple GPUs)**

Apple GPUs use tile-based deferred rendering (TBDR). Tile memory reads are free — leverage this for intermediate calculations.

**Avoid unnecessary render target stores**

```metal
// GOOD — early depth test
[[early_fragment_tests]]
half4 fragmentShader(...) {
    // Depth test runs before fragment shader
}

// GOOD — avoid storing when not needed
// Use .loadAction = .clear and .storeAction = .dontCare for intermediate passes
```

**Use `setFragmentBytes` for small data**

```swift
// Swift side — for small data (< 4KB), use setFragmentBytes instead of buffers
commandEncoder.setFragmentBytes(
    &uniforms,
    length: MemoryLayout<Uniforms>.stride,
    index: 0
)
```

### Branch Optimization

**Use function constants to eliminate branches**

```metal
// BAD — dynamic branching in hot path
if (materialType == 0) {
    color = calculateColorA();
} else if (materialType == 1) {
    color = calculateColorB();
}

// GOOD — use function constants (compile-time specialization)
[[function_constant(0)]] constant int materialType;
half4 calculateColor() {
    switch (materialType) {
        case 0: return calculateColorA();
        case 1: return calculateColorB();
    }
}
```

**Fixed loop bounds enable GPU unrolling**

```metal
// GOOD — fixed loop bound enables unrolling
for (int i = 0; i < 4; i++) {
    // GPU can unroll this
}

// AVOID — dynamic loop bound prevents unrolling
for (int i = 0; i < dynamicCount; i++) {
    // GPU cannot unroll
}
```

### Rendering Optimization

**Fullscreen quad with 4-vertex triangle strip**

```metal
// GOOD — 4 vertices for fullscreen quad
// Triangle strip: 2 triangles = 4 vertices
// Vertices: (-1,-1), (1,-1), (-1,1), (1,1)

// AVOID — 6 vertices for two triangles
// wastes vertex shader invocations
```

**Procedural textures to avoid sampling bandwidth**

```metal
// GOOD — procedural pattern (no texture sampling)
float noise = fract(sin(dot(position + time, float2(12.9898, 78.233))) * 43758.5453);

// AVOID — texture sampling for simple patterns
// wastes memory bandwidth
```

**Vectorize operations (SIMD)**

```metal
// GOOD — vectorized operations
float3 result = position * scale + offset;

// AVOID — scalar operations
float x = position.x * scale.x + offset.x;
float y = position.y * scale.y + offset.y;
float z = position.z * scale.z + offset.z;
```

**Reduce register pressure**

- Use fewer temporary variables
- Reuse registers when possible
- Prefer simpler calculations over complex ones

## iOS 18 Features

### Shader Compilation

**`compile()` method for device-specific preparation**

```swift
// iOS 18+ — pre-compile shader for current device
let shader = ShaderLibrary.dotwave
let compiledShader = try? shader.compile()

// Use compiled shader in layerEffect
.layerEffect(compiledShader(.float(time), .float2(center)))
```

Reduces first-frame jank by pre-compiling shaders for the current device at runtime.

### TimelineView Animation Pattern

```swift
struct AnimatedShaderView: View {
    let startDate = Date()
    
    var body: some View {
        TimelineView(.animation) { context in
            let elapsedTime = Float(startDate.timeIntervalSince(context.date))
            
            Circle()
                .fill(Color.blue)
                .layerEffect(
                    ShaderLibrary.noise(.float(elapsedTime))
                )
        }
    }
}
```

TimelineView triggers updates 60 times per second, passing the current date to calculate elapsed time for shader animation.

## iOS 26 Features (Metal 4)

### Metal 4 Enhancements (WWDC 2025)

**5 Key Areas:**

1. **Command Encoding Revolution**
   - Unified Command Encoders (MTL4ComputeCommandEncoder)
   - MTL4CommandQueue and MTL4CommandBuffer for parallel encoding
   - MTL4CommandAllocator for explicit memory management
   - Consolidates compute, blit, and acceleration structure operations

2. **Resource Management**
   - MTL4ArgumentTable for complex resource handling
   - Residency Sets for unified memory management
   - Placement Sparse Resources
   - Richer visual capabilities

3. **Shader Compilation**
   - MTL4Compiler interface
   - Faster compilation with reduced redundancy
   - Quality of service management
   - No more long compile waits during development

4. **Machine Learning Integration**
   - Native tensor support in Metal Shading Language
   - AI inference directly in shader code
   - Neural material evaluation workflow
   - Real-time AI-powered procedural texture generation

5. **MetalFX Enhancements**
   - **Frame Interpolation** - Think NVIDIA DLSS 3 Frame Generation for Apple Silicon
   - **Denoising** - Makes path tracing practical on Mac
   - Upscaling capabilities
   - Real-time ray tracing support

**Device Compatibility:**
- Mac: Apple M1 and later
- iOS/iPadOS: A14 Bionic and later

**Real-World Impact:**
- 60fps gameplay on M2 MacBook Air with frame interpolation
- AI integration enables new real-time effects
- Games using Metal 4: Cyberpunk 2077, Crimson Desert, InZOI

### Liquid Glass UI

Hardware-accelerated translucency effects with Metal Performance Shaders integrated with Core ML.

```swift
// iOS 26+ Liquid Glass UI
View()
    .liquidGlass(.prominent)           // Hardware-accelerated with Core ML
    .depthLayer(.background)           // Automatic depth sorting
    .adaptiveTint(.system)            // Context-aware colors
```

**Performance improvements:**
- 40% GPU usage reduction for same visual effects
- 39% faster render time
- 38% less memory usage

### SwiftUI Performance Revolution

**@Animatable Macro (iOS 26+)**

Eliminates manual animatableData logic:

```swift
@Animatable
struct WaveShape: Shape {
    var frequency: Double
    var amplitude: Double
    var phase: Double
    @AnimatableIgnored var lineWidth: CGFloat
    
    func path(in rect: CGRect) -> Path {
        // draw wave using frequency, amplitude, phase
    }
}
```

**Incremental state updates**

```swift
// iOS 26+ — only affected views re-render
@IncrementalState var items: [Item] = []

List(items) { item in
    ItemView(item)
        .incrementalID(item.id)  // Only this view updates
}
```

**Performance benchmarks:**
- 60fps with 2000+ items (vs 12fps previously)
- 60% memory usage reduction
- 45% Combine framework integration improvement

## Particle Animation Approaches

### Approach 1: SwiftUI Canvas + Metal Shader (DotWave style)

**Best for:** 2D grid-based effects, wave patterns, UI effects

**Pros:**
- Simple integration with SwiftUI
- Requires iOS 17+
- Sufficient for 1000-2000 particles
- Easy to maintain

**Cons:**
- Limited particle count
- Less control over individual particles

**Implementation:**

```swift
struct ParticleGrid: View {
    @State private var time: Float = 0
    let startDate = Date()
    
    var body: some View {
        TimelineView(.animation) { context in
            let elapsedTime = Float(startDate.timeIntervalSince(context.date))
            
            Canvas { context, size in
                // Draw particle grid
                for row in 0..<30 {
                    for col in 0..<30 {
                        let x = CGFloat(col) * 10 + 5
                        let y = CGFloat(row) * 10 + 5
                        let dot = Path(ellipseIn: CGRect(x: x, y: y, width: 8, height: 8))
                        context.fill(dot, with: .color(.blue))
                    }
                }
            }
            .layerEffect(
                ShaderLibrary.particleWave(
                    .float(elapsedTime),
                    .float2(size)
                )
            )
        }
    }
}
```

### Approach 2: MTKView + Compute Shaders

**Best for:** Complex particle systems, 10,000+ particles, physics simulations

**Pros:**
- Handles 10,000+ particles
- Full control over particle behavior
- Compute shaders for parallel processing
- Better performance for complex systems

**Cons:**
- More complex setup
- Requires UIKit integration via UIViewRepresentable
- More code to maintain

**Implementation:**

```swift
struct ParticleCloud: UIViewRepresentable {
    let center: CGPoint?
    let progress: Float
    private let metalView = MTKView()
    
    func makeUIView(context: Context) -> MTKView {
        metalView.device = MTLCreateSystemDefaultDevice()
        metalView.delegate = context.coordinator
        metalView.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        return metalView
    }
    
    func updateUIView(_ view: MTKView, context: Context) {
        context.coordinator.center = center ?? .zero
        context.coordinator.progress = progress
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(metalView: metalView)
    }
    
    class Coordinator: NSObject, MTKViewDelegate {
        var center = CGPoint(x: 0.5, y: 0.5)
        var progress: Float = 0.0 {
            didSet {
                metalView?.isPaused = progress == .zero
            }
        }
        
        private weak var metalView: MTKView?
        private let commandQueue: MTLCommandQueue
        private let computePipeline: MTLComputePipelineState
        
        init(metalView: MTKView) {
            self.metalView = metalView
            guard let device = MTLCreateSystemDefaultDevice(),
                  let commandQueue = device.makeCommandQueue(),
                  let library = device.makeDefaultLibrary(),
                  let function = library.makeFunction(name: "particleUpdate"),
                  let pipeline = try? device.makeComputePipelineState(function: function) else {
                fatalError("GPU not available")
            }
            self.commandQueue = commandQueue
            self.computePipeline = pipeline
            super.init()
        }
        
        func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
        
        func draw(in view: MTKView) {
            guard let drawable = view.currentDrawable,
                  let descriptor = view.currentRenderPassDescriptor,
                  let commandBuffer = commandQueue.makeCommandBuffer(),
                  let encoder = commandBuffer.makeComputeCommandEncoder() else {
                return
            }
            
            encoder.setComputePipelineState(computePipeline)
            // Configure threadgroups and dispatch
            encoder.endEncoding()
            
            let renderEncoder = commandBuffer.makeRenderCommandEncoder(descriptor: descriptor)!
            renderEncoder.endEncoding()
            
            commandBuffer.present(drawable)
            commandBuffer.commit()
        }
    }
}
```

**Particle Data Structure:**

```swift
struct Particle {
    let color: SIMD4<Float>
    let radius: Float
    let lifespan: Float
    let position: SIMD2<Float>
    let velocity: SIMD2<Float>
}

struct ParticleCloudInfo {
    let center: SIMD2<Float>
    let progress: Float
}
```

**Compute Shader:**

```metal
// ParticleUpdate.metal
#include <metal_stdlib>
using namespace metal;

struct Particle {
    float4 color;
    float radius;
    float lifespan;
    float2 position;
    float2 velocity;
};

struct ParticleCloudInfo {
    float2 center;
    float progress;
};

kernel void particleUpdate(
    device Particle* particles [[buffer(0)]],
    constant ParticleCloudInfo& info [[buffer(1)]],
    uint id [[thread_position_in_grid]]
) {
    Particle& p = particles[id];
    
    // Calculate direction from center
    float2 direction = normalize(p.position - info.center);
    
    // Update position
    p.position += p.velocity * info.progress;
    
    // Update lifespan
    p.lifespan -= 0.01;
    
    // Reset if dead
    if (p.lifespan <= 0.0) {
        p.position = info.center;
        p.lifespan = 1.0;
    }
}
```

### Approach 3: Metal Performance Shaders

**Best for:** High-performance standard effects using Apple-optimized kernels

**Pros:**
- Apple-optimized kernels
- Easy to use
- High performance for standard effects

**Cons:**
- Limited to predefined effects
- Less flexibility than custom shaders

**Available Shaders:**

```swift
import MetalPerformanceShaders

// Gaussian blur
let blur = MPSImageGaussianBlur(device: device, sigma: 10.0)
blur.encode(commandBuffer: commandBuffer, sourceTexture: source, destinationTexture: destination)

// Threshold
let threshold = MPSImageThreshold(device: device, thresholdValue: 0.5, linearGrayColorTransform: nil)
threshold.encode(commandBuffer: commandBuffer, sourceTexture: source, destinationTexture: destination)

// Custom kernel
class CustomKernel: MPSKernel {
    override func encode(commandBuffer: MTLCommandBuffer, sourceTexture: MTLTexture, destinationTexture: MTLTexture) {
        // Custom implementation
    }
}
```

## X/Twitter Example Patterns

Based on the examples from [radiofun/DotWave](https://github.com/radiofun/DotWave), [radiofun8](https://x.com/radiofun8/status/2050647976520098276), [eujinco](https://x.com/eujinco/status/2050865443272089819), and additional community research.

### Pattern 1: Dot Wave Pulse (radiofun/DotWave)

**Characteristics:**
- Grid of dots arranged in regular pattern
- Wave propagates from center outward
- Each dot oscillates based on distance from center
- tanh-based wavefront for smooth transitions

**Implementation:**

```metal
[[ stitchable ]]
half4 dotWavePulse(
    float2 position,
    half4 currentColor,
    float time,
    float2 center,
    float frequency,
    float amplitude
) {
    float distance = length(position - center);
    float wave = tanh(distance * frequency - time);
    float displacement = wave * amplitude;
    
    return half4(displacement, displacement, displacement, 1.0) * currentColor.a;
}
```

### Pattern 2: Ripple Effect

**Characteristics:**
- Circular ripple propagating from touch point
- Amplitude decays with distance
- Multiple ripples can coexist
- Often combined with glow effect

**Implementation:**

```metal
[[ stitchable ]]
half4 rippleEffect(
    float2 position,
    half4 currentColor,
    float time,
    float2 center,
    float frequency,
    float decay
) {
    float distance = length(position - center);
    float ripple = sin(distance * frequency - time * 5.0);
    float attenuation = exp(-distance * decay);
    float effect = ripple * attenuation;
    
    half4 baseColor = currentColor;
    return half4(
        baseColor.r + effect * 0.3,
        baseColor.g + effect * 0.3,
        baseColor.b + effect * 0.3,
        baseColor.a
    );
}
```

### Pattern 3: Grainy Meshy Gradients (@dejager)

**Characteristics:**
- Texture-like grainy material effects
- Mesh-like pattern overlays
- Animated gradient colors
- Used for wallpaper-like backgrounds

**Source:** [dejager/wallpaper](https://github.com/dejager/wallpaper) - SwiftUI Metal shader for grainy, meshy, gradient colors

**Implementation Pattern:**
```metal
[[ stitchable ]]
half4 grainyMesh(
    float2 position,
    half4 currentColor,
    float time,
    float grainIntensity,
    float meshScale
) {
    // Generate grain noise
    float noise = fract(sin(dot(position * meshScale + time, float2(12.9898, 78.233))) * 43758.5453);
    
    // Create mesh pattern
    float mesh = sin(position.x * meshScale) * sin(position.y * meshScale);
    
    // Combine grain and mesh
    float effect = noise * grainIntensity + mesh * 0.5;
    
    return half4(
        currentColor.r + effect * 0.2,
        currentColor.g + effect * 0.2,
        currentColor.b + effect * 0.2,
        currentColor.a
    );
}
```

### Pattern 4: Magnification Loupe (@jmtrivedi)

**Characteristics:**
- Interactive magnification glass effect
- Metal + SwiftUI + Wave framework
- iOS 17's new shader support
- Touch-driven magnification

**Source:** [jtrivedi/MagnificationLoupe](https://github.com/jtrivedi/MagnificationLoupe)

**Implementation Pattern:**
```swift
@MainActor
enum MagnificationLoupe {
    @ObservableState
    struct State: Equatable, Sendable {
        var magnificationPoint: CGPoint?
        var magnificationLevel: Float = 2.0
    }
    
    enum Action {
        case didTap(CGPoint)
        case didDrag(CGPoint)
        case updateMagnification(Float)
    }
}
```

### Pattern 5: iOS 17 AirDrop Animation (@dankuntz)

**Characteristics:**
- Fluid particle/ring animation
- SwiftUI with ShaderFunction (iOS 17+ only)
- Recreated iOS 17 AirDrop effect
- 64.5K views on X, highly popular pattern

**Source:** [AirDrop Shader Gist](https://gist.github.com/dkun7944/2f793643e469029fb4e7d700f0645ffc)

**Implementation Pattern:**
```metal
[[ stitchable ]]
half4 airDropRing(
    float2 position,
    half4 currentColor,
    float time,
    float2 center
) {
    float distance = length(position - center);
    float ring = smoothstep(50.0, 60.0, distance) * smoothstep(70.0, 60.0, distance);
    float wave = sin(distance * 0.1 - time * 3.0);
    float effect = ring * wave;
    
    return half4(
        currentColor.r + effect * 0.5,
        currentColor.g + effect * 0.3,
        currentColor.b + effect * 0.8,
        currentColor.a
    );
}
```

### Pattern 6: Particle Cloud Explosion

**Characteristics:**
- Particles explode from center
- Each particle has velocity and lifespan
- Physics-based movement
- Fade out over time

**Implementation:**

```swift
struct ParticleExplosion: View {
    @State private var particles: [Particle] = []
    @State private var isExploding = false
    
    var body: some View {
        Canvas { context, size in
            for particle in particles {
                let dot = Path(ellipseIn: CGRect(
                    x: particle.position.x,
                    y: particle.position.y,
                    width: particle.radius * 2,
                    height: particle.radius * 2
                ))
                context.fill(dot, with: .color(Color(
                    red: Double(particle.color.r),
                    green: Double(particle.color.g),
                    blue: Double(particle.color.b),
                    opacity: Double(particle.color.a)
                )))
            }
        }
        .onTapGesture {
            explode(at: CGPoint(x: 150, y: 150))
        }
        .onChange(of: isExploding) { _, _ in
            updateParticles()
        }
    }
    
    func explode(at point: CGPoint) {
        particles = (0..<100).map { _ in
            let angle = Float.random(in: 0...(2 * .pi))
            let speed = Float.random(in: 2...5)
            let velocity = SIMD2<Float>(
                cos(angle) * speed,
                sin(angle) * speed
            )
            return Particle(
                color: SIMD4<Float>(1, 0.5, 0, 1),
                radius: Float.random(in: 2...5),
                lifespan: 1.0,
                position: SIMD2<Float>(Float(point.x), Float(point.y)),
                velocity: velocity
            )
        }
        isExploding = true
    }
    
    func updateParticles() {
        guard isExploding else { return }
        
        particles = particles.compactMap { particle in
            var newParticle = particle
            newParticle.position += newParticle.velocity
            newParticle.lifespan -= 0.02
            newParticle.color.a *= 0.98
            
            return newParticle.lifespan > 0 ? newParticle : nil
        }
        
        if particles.isEmpty {
            isExploding = false
        }
    }
}
```

### Pattern 4: Glowing Border

**Characteristics:**
- Glow effect propagates along border
- Intensity varies with time
- Often combined with touch interaction
- Uses noise for organic feel

**Implementation:**

```metal
[[ stitchable ]]
half4 glowingBorder(
    float2 position,
    half4 currentColor,
    float time,
    float2 size,
    float borderWidth
) {
    float2 center = size / 2.0;
    float2 fromCenter = abs(position - center);
    float2 halfSize = size / 2.0;
    
    // Calculate distance from border
    float distFromBorder = min(
        min(fromCenter.x, halfSize.x - fromCenter.x),
        min(fromCenter.y, halfSize.y - fromCenter.y)
    );
    
    // Glow intensity based on distance and time
    float glow = smoothstep(borderWidth, 0.0, distFromBorder);
    glow *= 0.5 + 0.5 * sin(time * 3.0 + position.x * 0.1);
    
    // Add noise for organic feel
    float noise = fract(sin(dot(position + time, float2(12.9898, 78.233))) * 43758.5453);
    glow *= 0.8 + 0.2 * noise;
    
    return half4(
        currentColor.r + glow * 0.5,
        currentColor.g + glow * 0.3,
        currentColor.b + glow * 0.1,
        currentColor.a
    );
}
```

## Performance Checklist

### Before Production

- [ ] Use `half` precision for colors and most calculations
- [ ] Pre-compile shaders with `compile()` in iOS 18+
- [ ] Limit particle count based on device capabilities
- [ ] Use TimelineView for smooth 60fps animation
- [ ] Test on oldest supported device
- [ ] Monitor GPU usage with Xcode Metal debugger
- [ ] Use function constants to eliminate branches
- [ ] Leverage tile memory for TBDR GPUs
- [ ] Avoid unnecessary render target stores
- [ ] Use `setFragmentBytes` for small data (< 4KB)
- [ ] Vectorize operations (SIMD)
- [ ] Reduce register pressure

### For Complex Effects (10,000+ particles)

- [ ] Migrate to MTKView + Compute Shaders
- [ ] Use SIMD types for particle data
- [ ] Implement spatial partitioning for performance
- [ ] Consider Metal Performance Shaders for standard effects
- [ ] Use `.storageModeShared` for buffers
- [ ] Implement double buffering for smooth updates

### Device-Specific Targets

| Device | Recommended Particle Count | Approach |
|---|---|---|
| iPhone 8 / SE 2nd gen | 500-1,000 | Canvas + Metal Shader |
| iPhone 12 / 13 | 1,000-2,000 | Canvas + Metal Shader |
| iPhone 14 / 15 | 2,000-5,000 | MTKView + Compute Shaders |
| iPhone 16+ / Pro devices | 10,000+ | MTKView + Compute Shaders |

## Common Mistakes

### 1. Using float when half is sufficient

```metal
// BAD — unnecessary precision
half4 color = half4(1.0, 0.5, 0.0, 1.0);  // half is fine for colors
float position = 1.0;  // float only for position/depth

// GOOD — use half for colors
half4 color = half4(1.0h, 0.5h, 0.0h, 1.0h);
```

### 2. Dynamic branching in hot paths

```metal
// BAD — branch in fragment shader
if (condition) {
    result = calculateA();
} else {
    result = calculateB();
}

// GOOD — use function constants
[[function_constant(0)]] constant bool useA;
half4 calculate() {
    return useA ? calculateA() : calculateB();
}
```

### 3. Not pre-compiling shaders in iOS 18+

```swift
// BAD — first-frame jank
.layerEffect(ShaderLibrary.shader(.float(time)))

// GOOD — pre-compile for device
let compiled = try? ShaderLibrary.shader.compile()
.layerEffect(compiled(.float(time)))
```

### 4. Using buffers for small data

```swift
// BAD — buffer for small data
let buffer = device.makeBuffer(length: 16, options: ...)
encoder.setFragmentBuffer(buffer, offset: 0, index: 0)

// GOOD — setFragmentBytes for < 4KB
var uniforms: Uniforms = ...
encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 0)
```

### 5. Texture sampling for procedural patterns

```metal
// BAD — texture sampling for simple noise
float noise = texture.sample(sampler, position).r;

// GOOD — procedural noise
float noise = fract(sin(dot(position, float2(12.9898, 78.233))) * 43758.5453);
```

### 6. Forgetting early depth test

```metal
// BAD — fragment shader runs for all fragments
half4 fragmentShader(...) { ... }

// GOOD — early depth test skips hidden fragments
[[early_fragment_tests]]
half4 fragmentShader(...) { ... }
```

### 7. Not testing on target devices

Always test on the oldest device you support. GPU capabilities vary significantly between devices.

## References

### Apple Documentation

- [Learn performance best practices for Metal shaders](https://developer.apple.com/videos/play/tech-talks/111373/)
- [Discover Metal 4 (WWDC 2025)](https://developer.apple.com/videos/play/wwdc2025/205/)
- [Go further with Metal 4 games (WWDC 2025)](https://developer.apple.com/videos/play/wwdc2025/211/)
- [Metal Performance Shaders](https://developer.apple.com/documentation/metalperformanceshaders)
- [Metal Shading Language Specification](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf)
- [Create custom visual effects with SwiftUI (WWDC 2024)](https://developer.apple.com/videos/play/wwdc2024/10151/)
- [What's new in SwiftUI (WWDC 2025)](https://developer.apple.com/videos/play/wwdc2025/256/)

### Community Libraries

- [MetalCanvas - Easy Metal shader rendering](https://github.com/NakaokaRei/MetalCanvas) - Built-in uniforms (time, resolution, mouse, date), texture support, SwiftUI integration, timer controls
- [SwiftUI 5 Metal Shader Collection](https://github.com/eleev/swiftui-new-metal-shaders) - Kaleidoscope, wave effects, shape generator, Apollonian Gasket, scroll view enhancements
- [SwiftUI Metal Shader Demo](https://github.com/0Itsuki0/SwiftUI_MetalShaderDemo) - Demo of layer effect modifiers (colorEffect, distortionEffect, layerEffect)
- [Metal Compute Offscreen Render](https://github.com/gadirom/Metal-Compute-Offscreen-Render-and-Postprocess) - Particle interference patterns, double-slit experiment simulation
- [GPU Computed Particle System](https://github.com/julianlork/gpu-computed-particle-system-with-swift) - Simple particle system with Gaussian blur postprocessing

### Community Examples

- [DotWave - Metal shader wave effect](https://github.com/radiofun/DotWave)
- [dejager/wallpaper - Grainy, meshy gradients](https://github.com/dejager/wallpaper)
- [jtrivedi/MagnificationLoupe - Interactive magnification](https://github.com/jtrivedi/MagnificationLoupe)
- [AirDrop iOS 17 Animation Shader](https://gist.github.com/dkun7944/2f793643e469029fb4e7d700f0645ffc)
- [Inferno - Metal shaders for SwiftUI](https://github.com/twostraws/Inferno)
- [Sparkling things with Metal and SwiftUI](https://uvolchyk.medium.com/sparkling-shiny-things-with-metal-and-swiftui-cba69c730a24)
- [How to add Metal shaders to SwiftUI views](https://www.hackingwithswift.com/quick-start/swiftui/how-to-add-metal-shaders-to-swiftui-views-using-layer-effects)

### Tutorials

- [How to write Metal Shaders on iOS](https://medium.com/icommunity/how-to-write-metal-shaders-on-ios-80e3baa8826e)
- [Custom Parameters and Animation with Metal Shaders](https://www.createwithswift.com/custom-parameters-and-animation-with-metal-shaders/)
- [Ripple Visual Effect Interaction with Metal Shader](https://designcode.io/swiftui-handbook-ripple-visual-effect/)

### Performance Guides

- [Advanced Metal Shader Optimization (WWDC16)](https://developer.apple.com/videos/play/wwdc2016/606/)
- [Harness Apple GPUs with Metal (WWDC20)](https://developer.apple.com/videos/play/wwdc2020/10661/)
- [Metal Shader Reference](https://raw.githubusercontent.com/MiniMax-AI/skills/main/skills/ios-application-dev/references/metal-shader.md)
