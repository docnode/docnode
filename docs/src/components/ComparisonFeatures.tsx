import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function TypeFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">Type</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">ID-based OT vs CRDT</h4>
          <p className="text-sm">
            OT is often associated with positional operations: "insert element
            at position X". It's no surprise this is frequently criticized. When
            a long-lived branch wants to apply operations, it must transform all
            of them based on the ones it "missed", which is very slow.{" "}
            <strong>ID-based OT</strong>, however, can apply its operations
            directly (O(1)), without needing to transform them. It's basically a
            CRDT, but without P2P support in exchange for less complexity and
            metadata.{" "}
            <a
              href="/docs/ot-vs-crdt"
              className="text-blue-600 hover:underline"
            >
              See more in OT vs CRDT
            </a>
            .
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function SyncBackendFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Sync / Backend solution
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Backend Infrastructure</h4>
          <p className="text-sm">
            You can think of DocNode Core as an alternative to Yjs. On the other
            hand, DocNode Sync would be to DocNode what{" "}
            <a
              href="https://tiptap.dev/docs/hocuspocus/introduction"
              className="text-blue-600 hover:underline"
            >
              Hocuspocus
            </a>{" "}
            or{" "}
            <a
              href="https://jamsocket.com/y-sweet"
              className="text-blue-600 hover:underline"
            >
              Y-Sweet
            </a>{" "}
            are to Yjs.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function PricingFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">Pricing</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <p className="text-sm">
            Read our{" "}
            <a href="/docs/license" className="text-blue-600 hover:underline">
              License and Pricing page
            </a>
            .
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function LicenseFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">License</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <p className="text-sm">
            Read our{" "}
            <a href="/docs/license" className="text-blue-600 hover:underline">
              License and Pricing page
            </a>
            .
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function TypesOfNodesFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Types of nodes
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Data Structure Types</h4>
          <p className="text-sm">
            Binding a data structure to Yjs can be complicated, as there are
            many ways to do it and each data type has its peculiarities. In
            DocNode you can define different types of nodes, but the only thing
            that changes between them is their state. In everything else, they
            are instances of DocNode, a tree node.{" "}
            <a href="/docs/nodes" className="text-blue-600 hover:underline">
              See more in Nodes
            </a>
            .
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function BundleSizeFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Bundle size (gzip)
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Client-Side Package Size</h4>
          <p className="text-sm">
            The compressed size of the library when included in your application
            bundle. Smaller bundles mean faster page loads and better
            performance on mobile devices. Links for{" "}
            <a
              href="https://bundlejs.com/?q=docnode"
              className="text-blue-600 hover:underline"
            >
              DocNode
            </a>{" "}
            and{" "}
            <a
              href="https://bundlejs.com/?q=yjs"
              className="text-blue-600 hover:underline"
            >
              Yjs
            </a>{" "}
            here.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function TypeSafeSchemasFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Type-safe node schemas
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">TypeScript Type Safety</h4>
          <p className="text-sm">
            DocNode provides <strong>full TypeScript type inference</strong>{" "}
            based on your node definitions, catching errors at compile time. In
            addition, DocNode comes with State Definitions out of the box that
            serialize to super compact JSON, making your documents even smaller.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function MoveOperationFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Move operation
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Native Move Support</h4>
          <p className="text-sm">
            In Yjs you can simulate moves with delete + insert, which can result
            in duplicate nodes. This is a known and difficult-to-solve problem
            efficiently in CRDTs. Other CRDTs solve it by storing more metadata
            or operations. By requiring a central server, DocNode can solve this
            problem in the most efficient way possible.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function HardDeletesFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Hard deletes
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">True Deletion</h4>
          <p className="text-sm">
            CRDTs use soft deletes ("tombstones") to enable P2P sync, causing
            documents to grow forever. Accidentally paste 1000 paragraphs and
            delete them? A CRDT keeps that metadata permanently. DocNode's
            server-based approach allows true deletion, keeping documents lean.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function P2PSupportFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          P2P support
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Peer-to-Peer Networking</h4>
          <p className="text-sm">
            P2P comes with tradeoffs: larger documents and more complex
            algorithms. DocNode prioritizes simplicity and efficiency with a
            server-based architecture. Need P2P for your use case? We could
            implement a CRDT mode with funding—
            <a href="/contact" className="text-blue-600 hover:underline">
              contact us
            </a>
            .
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function SchemaNormalizationFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Schema normalization
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">
            Automatic Schema Enforcement
          </h4>
          <p className="text-sm">
            Want documents to always start with a heading? Limit consecutive
            bullets to five? DocNode's Normalizers let you define custom rules
            to enforce any structure automatically.{" "}
            <a
              href="/docs/doc-lifecycle"
              className="text-blue-600 hover:underline"
            >
              Learn more
            </a>
            .
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function AutomaticBatchingFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Automatic batching
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Smart Operation Batching</h4>
          <p className="text-sm">
            DocNode{" "}
            <a href="/docs/doc-lifecycle#batching">
              automatically batches operations
            </a>{" "}
            within the same synchronous execution context, reducing overhead and
            boosting performance. No manual transaction management needed.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function NodeIDsPublicFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Node IDs are public
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Stable Public IDs</h4>
          <p className="text-sm">
            Every DocNode has a <strong>public, stable ID</strong> perfect for
            references, deep linking, and external integrations. Yjs uses
            internal identifiers not meant for external use.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function NoInsertsMetadataFeature() {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted">
          Metadata-free inserts
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="prose prose-sm prose-a:text-inherit space-y-2">
          <h4 className="text-sm font-semibold">Clean Insert Operations</h4>
          <p className="text-sm">
            CRDTs require metadata not only when deleting (soft deletes /
            tombstones) or moving, but also when inserting. Nodes must preserve
            information like which nodes were adjacent at insertion time
            (OriginLeft and OriginRight in Yjs).
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
