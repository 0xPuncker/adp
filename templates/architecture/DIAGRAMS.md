# Architecture Diagrams

> C4 Model diagrams showing system architecture at multiple levels

**Last Updated:** {YYYY-MM-DD}

---

## Level 1: Context

See `CONTEXT_MAP.md` for the system context diagram.

---

## Level 2: Container

```mermaid
C4Container
    title {Project Name} - Container Diagram

    Person(user, "User", "A {role}")
    
    System_Boundary(c1, "{Project Name}", "The {description} system") {
        Container(web, "Web Application", "{Framework}", "User-facing application")
        Container(api, "API Service", "{Framework}", "RESTful API")
        ContainerDb(db, "Database", "{Database}", "Stores {data}")
        Container(cache, "Cache", "{Cache}", "Caches {data}")
    }
    
    System_Ext(ext, "{External System}", "{description}")
    
    Rel(user, web, "{Verb}", "HTTPS")
    Rel(web, api, "{Verb}", "HTTPS")
    Rel(api, db, "{Verb}", "{Protocol}")
    Rel(api, cache, "{Verb}", "{Protocol}")
    Rel(api, ext, "{Verb}", "{Protocol}")
```

### Container Descriptions

| Container | Description | Technology | Responsibilities |
|------------|-------------|------------|------------------|
| {Container 1} | {What it does} | {Tech stack} | {Key responsibilities} |
| {Container 2} | {What it does} | {Tech stack} | {Key responsibilities} |

### Container Interactions

| From | To | Verb | Protocol | Data |
|------|----|----|----------|------|
| {Container 1} | {Container 2} | {Action} | {Protocol} | {What's exchanged} |
| {Container 2} | {Container 3} | {Action} | {Protocol} | {What's exchanged} |

---

## Level 3: Component

### {Container Name} Components

```mermaid
C4Component
    title {Container Name} - Component Diagram

    Container(c1, "{Container Name}", "{description}") {
        Component(ui, "UI Layer", "{Framework}", "User interface")
        Component(api, "API Layer", "{Framework}", "API endpoints")
        Component(domain, "Domain Layer", "{Language}", "Business logic")
        Component(infra, "Infrastructure", "{Language}", "External integrations")
    }
    
    ContainerDb(db, "Database", "{Database}")
    
    Rel(ui, api, "{Verb}")
    Rel(api, domain, "{Verb}")
    Rel(domain, infra, "{Verb}")
    Rel(infra, db, "{Verb}")
```

### Component Descriptions

| Component | Description | Responsibilities |
|------------|-------------|------------------|
| {Component 1} | {What it does} | {Key responsibilities} |
| {Component 2} | {What it does} | {Key responsibilities} |

---

## Sequence Diagrams

### {Scenario 1}: {Description}

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Web as Web App
    participant API as API Service
    participant DB as Database
    
    User->>Web: {Action 1}
    Web->>API: {Request}
    API->>DB: {Query}
    DB-->>API: {Result}
    API-->>Web: {Response}
    Web-->>User: {Display}
```

### {Scenario 2}: {Description}

```mermaid
sequenceDiagram
    autonumber
    participant Service1 as {Service 1}
    participant Service2 as {Service 2}
    participant External as {External System}
    
    Service1->>Service2: {Request}
    Service2->>External: {Call}
    External-->>Service2: {Response}
    Service2-->>Service1: {Response}
```

---

## State Diagrams

### {Entity}: State Machine

```mermaid
stateDiagram-v2
    [*] --> {State 1}: {Event 1}
    {State 1} --> {State 2}: {Event 2}
    {State 2} --> {State 3}: {Event 3}
    {State 3} --> {State 1}: {Event 4}
    {State 1} --> [*]: {Event 5}
    {State 2} --> [*]: {Event 6}
```

---

## Deployment Diagram

```mermaid
graph TB
    subgraph Production
        LB[Load Balancer]
        
        subgraph Web Tier
            W1[Web 1]
            W2[Web 2]
            W3[Web 3]
        end
        
        subgraph API Tier
            A1[API 1]
            A2[API 2]
            A3[API 3]
        end
        
        subgraph Data Tier
            DB[(Primary DB)]
            DB_R[(Read Replica)]
            CACHE[Redis Cluster]
        end
    end
    
    LB --> W1 & W2 & W3
    W1 & W2 & W3 --> A1 & A2 & A3
    A1 & A2 & A3 --> DB & DB_R
    A1 & A2 & A3 --> CACHE
```

### Infrastructure Details

| Tier | Instance Type | Count | Storage |
|------|---------------|-------|---------|
| Web | {Instance type} | {Count} | {N/A} |
| API | {Instance type} | {Count} | {N/A} |
| DB | {Instance type} | {Count} | {Size} |
| Cache | {Instance type} | {Count} | {Size} |

---

## Network Diagram

```mermaid
graph TB
    subgraph VPC
        subgraph Public Subnet
            LB[Load Balancer]
            NAT[NAT Gateway]
        end
        
        subgraph Private Subnet
            APP[App Servers]
            DB[(Database)]
        end
        
        IGW[Internet Gateway]
    end
    
    IGW --> LB
    LB --> APP
    APP --> NAT
    APP --> DB
```

### Network Details

| Network | CIDR | Purpose |
|---------|------|---------|
| {Network 1} | {CIDR} | {Purpose} |
| {Network 2} | {CIDR} | {Purpose} |
