# Implementation Plan

- [x] 1. Update Property 3 test with timeout configuration
  - Locate the test "Property: Floating avatar stays visible on order and pay screens while connected" at line ~66
  - Add fast-check configuration object as second argument to fc.assert()
  - Set numRuns to 50
  - Set timeout to 30000 milliseconds
  - Add Jest timeout of 35000 milliseconds as third argument to it()
  - Verify no changes to test logic itself
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Update Property 4 test with timeout configuration
  - Locate the test "Property: avatar connection and display state persists when navigating from order to pay" at line ~135
  - Add fast-check configuration object as second argument to fc.assert()
  - Set numRuns to 50
  - Set timeout to 30000 milliseconds
  - Add Jest timeout of 35000 milliseconds as third argument to it()
  - Verify no changes to test logic itself
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Run test suite and verify all tests pass
  - Execute: `cd apps/cashier-frontend && npm test`
  - Verify: 5 tests pass, 0 tests fail
  - Verify: 3 test suites pass, 0 test suites fail
  - Verify: Exit code is 0
  - Verify: No timeout errors in output
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Run specific test file to verify timeout fixes
  - Execute: `npm test -- avatarVisibility.property.test.tsx`
  - Verify: Property 3 test completes successfully
  - Verify: Property 4 test completes successfully
  - Verify: Both tests complete within configured timeout
  - _Requirements: 1.5, 2.5_

- [x] 5. Verify timeout configuration consistency
  - Confirm Jest timeout (35000ms) is 5000ms longer than fast-check timeout (30000ms)
  - Confirm numRuns is set to 50 for both navigation-heavy tests
  - Confirm configuration follows the pattern: fc.assert(fc.asyncProperty(...), { numRuns: 50, timeout: 30000 })
  - Confirm Jest timeout is passed as third argument to it()
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Final verification checkpoint
  - Run full test suite one more time: `npm test`
  - Confirm all 5 tests pass
  - Confirm no regression in previously passing tests
  - Ask user if any issues arise
  - _Requirements: All_
