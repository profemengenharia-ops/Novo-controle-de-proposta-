# Security Specification - ProFem Proposal Gen

## Data Invariants
1. A Proposal must have a `createdBy` field matching the UID of the creator.
2. Only the creator or an admin can update or delete a Proposal.
3. Products can be read by any authenticated user but managed only by authorized personnel (for now, any engineer).
4. Status transitions for Proposals must follow the defined `ProposalStatus` enum.

### Collection: `proposals`

| Operation | Requirement | Data Validation |
|-----------|-------------|-----------------|
| `get`     | `isSignedIn()` | N/A |
| `list`    | `isSignedIn() && resource.data.createdBy == request.auth.uid` | N/A |
| `create`  | `isSignedIn()` | `isValidProposal(incoming())` |
| `update`  | `isSignedIn() && incoming().createdBy == existing().createdBy` | `isValidProposal(incoming())` & `hasOnly([allowedFields])` |
| `delete`  | `isSignedIn() && isOwner(existing().createdBy)` | N/A |

**Allowed Fields for Update:**
- `clientName`, `scopeTitle`, `status`, `technicalScope`, `commercialProposal`, `updatedAt`, `validityDays`, `deadline`, `lossReason`, `interactions`, `revisions`, `revision`.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a proposal with a `createdBy` field belonging to another user.
2. **Access Violation**: Attempt to read a proposal without being authenticated.
3. **Privilege Escalation**: Attempt to update another user's proposal.
4. **ID Poisoning**: Attempt to create a proposal with an extremely long document ID.
5. **Schema Violation**: Attempt to save a proposal with missing required fields (e.g., `clientName`).
6. **Type Mismatch**: Attempt to save `validityDays` as a string instead of an integer.
7. **Negative Value**: Attempt to save a Negative `price` in a Product.
8. **Shadow Field**: Attempt to inject `isApproved: true` into a proposal payload.
9. **Terminal State Bypass**: Attempt to update a proposal that is already in `WON` status.
10. **Timestamp Spoofing**: Attempt to provide a client-side `updatedAt` that doesn't match `request.time`.
11. **Malicious ID Injection**: Use special characters in the `proposalId` to break queries.
12. **PII Leak**: Attempt to list all proposals without being authenticated.

## The Test Runner
(Tests will be implemented in `firestore.rules.test.ts` if environment supports it, otherwise manually verified via rules logic)
