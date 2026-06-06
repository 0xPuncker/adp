---
name: motion
description: >-
  Reference for the Motion transition layer in Source/Design/Motion/ — the
  TCA-friendly wrapper over the Transmission library. Trigger when adding or
  modifying a modal/sheet/popover/zoom/hero presentation, when a file imports
  Transmission, when touching files matching Motion+*.swift / Motion+Hero+*.swift,
  when wiring a @Presents destination to a tap target in a SwiftUI view, when
  debugging transition behavior (background bleed, double-presentation, dismiss
  not firing), or when picking between sheet/card/popover/fullscreen/toast/
  zoom/matchedGeometry/slide/custom for a new screen flow.
---

# Motion & Transitions

The app standardizes UIKit-driven transitions through a TCA-friendly wrapper layer over the [Transmission](https://github.com/nathantannar4/Transmission) library. Presentation and dismissal are reducer-driven (set/clear an optional store) — never imperative. All link types live under `Source/Design/Motion/`.

## Namespace Layout

- **`Motion`** — top-level namespace. Holds modal-side transitions (sheet, fullscreen, popover, currentContext, card, toast, slide, custom) plus the generic primitives.
- **`Motion.Hero`** — sub-namespace for source-anchored transitions only. A transition belongs here **iff it morphs the source view's geometry into the destination's frame**. Today: `ZoomLink` and `MatchedGeometryLink`.

> Popover is positioned near a source but does not morph it, so it stays in `Motion`, not `Motion.Hero`.

## The TCA Contract

Every link in this layer takes the same identity inputs:

- `sourceID: ID` — stable identity of this specific source view (typically the model's id).
- `activeID: ID?` — the id currently being presented; comes from `store.<destination>?.<id field>`.
- `item: Binding<Store<State, Action>?>` — `$store.scope(state: \.<destination>, action: \.<destination>)`.
- `onTap: () -> Void` — fires the action that sets `state.<destination>`.
- `@ViewBuilder label: () -> Label` and `@ViewBuilder destination: (Store<State, Action>) -> Destination`.

The `activeID == sourceID` gate ensures only the tapped source presents (multi-source disambiguation in `ForEach`). UIKit-driven dismiss writes `nil` back through the binding, which fires `PresentationAction.dismiss` in the reducer.

## Generic Primitives

Use these when no named convenience fits, or when the reducer needs to drive transition choice from state:

- **`Motion.PresentationLink<...>`** — accepts any `PresentationLinkTransition` (modal-side: sheet, card, popover, fullscreen, currentContext, toast, slide, zoom, matchedGeometry, custom, default, crossDissolve).
- **`Motion.DestinationLink<...>`** — accepts any `DestinationLinkTransition` (push-side: default, push, zoom, slide, matchedGeometry, matchedGeometryZoom, crossDissolve, custom).

```swift
Motion.DestinationLink(
    sourceID: item.id,
    activeID: store.modalidade?.item.id,
    item: $store.scope(state: \.modalidade, action: \.modalidade),
    onTap: { store.send(.view(.didTapItem(item))) },
    transition: .zoom(preferredPresentationBackgroundColor: .clear)
) {
    EditorialListCard(item: item)
} destination: { modalidadeStore in
    Modalidade.ContentView(store: modalidadeStore)
}
```

## Named Convenience Links

Each wraps the appropriate primitive with the right Transmission factory and surfaces only the parameters that factory exposes. Defaults match Transmission's defaults; the only opinionated default is `animation: .default`.

| Type | Sides | Notes |
| --- | --- | --- |
| `Motion.SheetLink` | modal | detents, grabber, corner radius |
| `Motion.FullscreenLink` | modal | full-screen modal |
| `Motion.PopoverLink` | modal | arrow direction, dimming, passthrough |
| `Motion.CurrentContextLink` | modal | scoped to current container |
| `Motion.CardLink` | modal | card aspect ratio, edge inset, shadow |
| `Motion.ToastLink` | modal | edge slide-in toast |
| `Motion.SlideLink` | modal **+** push | dual-sided via `Kind` |
| `Motion.CustomLink` | modal | wraps `PresentationLinkTransitionRepresentable` |
| `Motion.Hero.ZoomLink` | modal **+** push | dual-sided via `Kind` (iOS 18+ zoom) |
| `Motion.Hero.MatchedGeometryLink` | modal **+** push | dual-sided via `Kind` |

## Dual-Sided Pattern (Kind enum)

When a transition exists on both sides of Transmission (`zoom`, `slide`, `matchedGeometry`), the link exposes a nested `Kind` enum. Each case carries only the parameters that side's factory accepts — invalid combinations are unrepresentable at compile time. Default is `.modal()`.

```swift
Motion.Hero.ZoomLink(
    sourceID: item.id,
    activeID: store.detail?.item.id,
    item: $store.scope(state: \.detail, action: \.detail),
    onTap: { store.send(.view(.didTapItem(item))) },
    kind: .modal()    // or .push(prefersScalePresentingView: true)
) {
    Card(item: item)
} destination: { detailStore in
    Detail.ContentView(store: detailStore)
}
```

## Hero Progress Environment

`EnvironmentValues.heroProgress` (declared by `Motion.Hero.ProgressKey`) carries the current zoom progress (0–1). Read it inside a destination view via `@Environment(\.heroProgress) var heroProgress` to drive interruptible animations (e.g. fade a bottom bar in/out as the user drags the modal). Transmission's `TransitionReader` is the underlying source — see `Source/Features/Modalidade/Modalidade+View.swift` for a working example.

## Choosing a Link (decision tree)

1. Need a sheet/card/popover/fullscreen/toast? → named `Motion.<X>Link`.
2. Need a hero (zoom/matchedGeometry that morphs from a source view)? → `Motion.Hero.<X>Link` and pick `kind: .modal()` or `.push()`.
3. Need an arbitrary Transmission transition we don't have a named wrapper for (e.g. `.crossDissolve`, `.matchedGeometryZoom`, `.push`)? → `Motion.PresentationLink` / `Motion.DestinationLink` with that transition.
4. Need a fully bespoke transition? → `Motion.CustomLink(transition:)` with your own `PresentationLinkTransitionRepresentable`.

## Reducer Pattern

The reducer side mirrors any TCA presentation; nothing about it is Motion-specific:

```swift
@Reducer
struct Feature {
    @ObservableState
    struct State: Equatable {
        @Presents var detail: Detail.Feature.State?
    }

    enum Action {
        case view(View)
        case detail(PresentationAction<Detail.Feature.Action>)

        enum View {
            case didTapItem(Item)
        }
    }

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case let .view(.didTapItem(item)):
                state.detail = Detail.Feature.State(item: item)
                return .none
            case .detail, .view:
                return .none
            }
        }
        .ifLet(\.$detail, action: \.detail) { Detail.Feature() }
    }
}
```

## `MotionTransitionStyle`

When a feature wants to vary the transition from state, `MotionTransitionStyle` is a discriminated enum (`.zoom` / `.card` / `.slide` / `.sheet` / `.custom`) that maps to a `PresentationLinkTransition`. Pair it with `Motion.PresentationLink(transition: style.transition, ...)`. Modal-side only — push-side zoom remains reachable via `Motion.Hero.ZoomLink(kind: .push(...))`.

## Don'ts

- **Don't use SwiftUI's `.sheet(item:)` / `.fullScreenCover(item:)`** for new presentations — go through `Motion.*` so identity/dismiss/interruptibility behave consistently.
- **Don't pass `preferredPresentationBackgroundColor: .clear`** unless the destination view applies its own opaque background — the source view bleeds through and looks broken.
- **Don't use `NavigationStack`** to push hero destinations — the system zoom is push-style on the destination side, but it lives behind `Motion.Hero.ZoomLink(kind: .push(...))`, not in a stack.
- **Don't reach for `Motion.PresentationLink` / `Motion.DestinationLink` when a named link fits** — the named link is the readable choice and surfaces only the relevant knobs.

## File Layout

```
Source/Design/Motion/
├── Motion.swift                              // enum Motion {}
├── Motion+Hero.swift                         // enum Motion.Hero, ProgressKey, heroProgress
├── Motion+PresentationLink.swift             // generic modal-side primitive
├── Motion+DestinationLink.swift              // generic push-side primitive
├── Motion+SheetLink.swift                    // named conveniences (one per transition)
├── Motion+FullscreenLink.swift
├── Motion+PopoverLink.swift
├── Motion+CurrentContextLink.swift
├── Motion+CardLink.swift
├── Motion+ToastLink.swift
├── Motion+SlideLink.swift                    // dual-sided
├── Motion+CustomLink.swift
├── Motion+TransitionStyle.swift              // MotionTransitionStyle enum
├── Motion+Hero+ZoomLink.swift                // Motion.Hero.* (dual-sided)
└── Motion+Hero+MatchedGeometryLink.swift
```

Naming convention: file name = full namespace path joined with `+`. Files declaring types directly under `Motion` use `Motion+<Type>.swift`; files declaring types under `Motion.Hero` use `Motion+Hero+<Type>.swift`.

## Reference Call Sites

Working examples in the codebase:

- `Source/Features/Home/Home+View.swift:49` — `Motion.Hero.ZoomLink(kind: .modal())` for the featured card.
- `Source/Features/Home/Home+View.swift:65` — `Motion.Hero.ZoomLink(kind: .modal())` inside a `ForEach` with shared `item` binding.
- `Source/Features/Modalidade/Modalidade+View.swift:19` — destination side reading `\.heroProgress` via `TransitionReader`.
