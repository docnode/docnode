# DocNode Sync Engine Documentation

## Architecture Overview

The sync engine follows this flow:

Main thread <--> Shared worker <--> IndexedDB\* <--> Server <--> Central DB

I may explore alternatives to reduce latency in RTC situations. For example, the order of IndexedDB and Server could be changed, or some things could be done at times from the main thread. I am skeptical that this will happen, because this unidirectional flow provides a much simpler and easier to implement thinking framework.

\*Note: future versions may include SQLite as an alternative or replacement for the IndexedDB provider.

## Document Categories

When a user connects to the app, their documents can be divided into 3 groups based on concurrent user activity.

### A. Multiple Active Users

- Scenario: There is at least one other user editing the same document.
- When the user requests the document for the first time, he pulls the entire document (because his local copy may be out of date),
- But after that we want the server to propagate the operations of any user, without them having having to pull the entire document (which would increase latency and data over the wire).

### B. Single Active Users

- Scenario: There is no other user connected to the network and using the same document at that time.
- As in group A, When the user requests the document for the first time, he pulls the entire document (because his local copy may be out of date),
- The difference is that the server does not need to squash and merge operations eagerly, nor return them to the user. Squash and merge operations can be postponed when a user pulls, and potentially also at debounced intervals.

### C. No Active Users

- Scenario: When the client connects to the app, it is possible that documents he did not request may be out of date in his local copy, either because they were modified by another user or on another device, or because local data was lost.
- This category is not as important as the other two. If we do nothing with these, when the user does request it, he will do a lazy pull with the logic implemented for the other two categories of documents. It is very likely that by that time in many cases he will have a full or partial copy of the document locally, making the request fast.
- However, due to possible connection failures or cold requests (i.e., without an up-to-date local copy), it would be ideal to perform eagerly pulls in the background.
- It would be possible to build an architecture on the server that synchronizes the 3 categories at the same time. The problem is that the prioritization and management of the queue becomes very complex, and the server would have to keep in memory too much information for each connected user (an index of all the user's documents and the last version he has).
- That is why we split the architecture of the sync engine in two parts:
  1. Real-time mechanism (Categories A & B)
     - No polling required
     - Direct operation handling
  2. Background thread (Category C)
     - Polling-based updates
     - Low priority, high interval
- Other observations:
  - Decoupling category C to a separate process would also allow us to do document-based sharding.
  - It is good for the user to have an indicator of which documents are being updated in the background. We could use a polling interval of about 2 minutes when the user is connected, and 1 h when not in a service worker.
