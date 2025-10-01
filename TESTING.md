# Testing Guide

This document provides comprehensive information about testing the DayFlow application.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#ci/cd-integration)
- [Test Data Management](#test-data-management)

## Testing Strategy

DayFlow follows a comprehensive testing strategy with multiple layers:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test how different parts work together
3. **E2E Tests** - Test complete user workflows
4. **Visual Regression Tests** - Ensure UI consistency (optional)

## Test Types

### Unit Tests (Jest + React Testing Library)

Located in `tests/unit/`, unit tests cover:

- **Components** - UI components with props and user interactions
- **Hooks** - Custom React hooks logic
- **Utils** - Utility functions and helpers
- **Store** - Zustand state management
- **Validations** - Input validation logic

**Example:**
```typescript
describe('TaskItem', () => {
  it('renders task title correctly', () => {
    const task = createMockTask({ title: 'Test Task' });
    render(<TaskItem task={task} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

Located in `tests/e2e/`, E2E tests cover:

- **Dashboard** - Navigation and layout
- **Task Management** - CRUD operations for tasks
- **Event Management** - CRUD operations for events
- **Drag & Drop** - Dragging tasks and events
- **Quick Add** - Natural language entry
- **Calendar View** - Week navigation and display
- **Theme Switching** - Light/dark theme toggle
- **Responsive Design** - Mobile and tablet layouts

**Example:**
```typescript
test('user can create a task', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[aria-label="Add task"]');
  await page.fill('input[name="title"]', 'New Task');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=New Task')).toBeVisible();
});
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run in watch mode (for development)
pnpm test:watch

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test TaskItem.test.tsx

# Run tests matching pattern
pnpm test --testNamePattern="should render"
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/e2e/dashboard.spec.ts

# Run specific browser
pnpm test:e2e --project=chromium

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Debug mode
pnpm test:e2e --debug
```

### Run All Tests

```bash
# Run unit and E2E tests
pnpm test && pnpm test:e2e
```

## Test Coverage

### Current Coverage

- **Unit Tests**: Comprehensive coverage of core logic
- **E2E Tests**: Complete user workflows covered

### Coverage Goals

- Unit tests: >80% code coverage
- E2E tests: All critical user paths
- Integration tests: Key interactions between modules

### Viewing Coverage

```bash
# Generate coverage report
pnpm test -- --coverage

# Coverage report will be in coverage/lcov-report/index.html
open coverage/lcov-report/index.html
```

## Writing Tests

### Unit Test Guidelines

1. **Test behavior, not implementation**
   ```typescript
   // Good
   it('displays error when title is empty', () => {
     // Test what the user sees
   });
   
   // Avoid
   it('calls setState with error message', () => {
     // Testing implementation details
   });
   ```

2. **Use descriptive test names**
   ```typescript
   // Good
   it('shows completed badge when task is marked complete', () => {});
   
   // Avoid
   it('test1', () => {});
   ```

3. **Follow AAA pattern** (Arrange, Act, Assert)
   ```typescript
   it('marks task as complete', () => {
     // Arrange
     const task = createMockTask();
     render(<TaskItem task={task} />);
     
     // Act
     fireEvent.click(screen.getByRole('checkbox'));
     
     // Assert
     expect(screen.getByRole('checkbox')).toBeChecked();
   });
   ```

4. **Use test utilities**
   ```typescript
   import { render, screen } from '@/tests/utils/test-utils';
   import { createMockTask } from '@/tests/utils/test-utils';
   ```

### E2E Test Guidelines

1. **Test user workflows, not implementation**
   - Focus on what users do, not how it's coded
   - Test complete scenarios from start to finish

2. **Use Page Object Model for complex flows**
   ```typescript
   // Use helpers for reusable actions
   await createTask(page, {
     title: 'New Task',
     category: 'work',
     priority: 'high'
   });
   ```

3. **Prefer accessible selectors**
   ```typescript
   // Good - Accessible
   await page.click('button[aria-label="Add task"]');
   await page.getByRole('button', { name: 'Add task' });
   
   // Avoid - Implementation-specific
   await page.click('.btn-add-task');
   ```

4. **Keep tests independent**
   - Each test should work in isolation
   - Don't depend on other tests' side effects
   - Clean up after tests when needed

5. **Use appropriate timeouts**
   ```typescript
   // Wait for specific conditions
   await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
   
   // Wait for network requests
   await page.waitForLoadState('networkidle');
   ```

### Test File Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/          # Component tests
│   ├── hooks/              # Hook tests
│   ├── lib/                # Utility tests
│   ├── store/              # Store tests
│   └── validations/        # Validation tests
├── e2e/                    # E2E tests
│   ├── helpers.ts          # Test helpers
│   ├── dashboard.spec.ts   # Dashboard tests
│   ├── task-management.spec.ts
│   └── ...
└── utils/                  # Test utilities
    └── test-utils.tsx      # Shared test helpers
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test -- --coverage
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Continuous Testing

- **Pre-commit**: Run unit tests before committing
- **Pull Request**: Run all tests on PR creation
- **Main Branch**: Full test suite on merge
- **Nightly**: Full E2E suite with extended scenarios

## Test Data Management

### Mock Data

Use consistent mock data from `tests/utils/test-utils.tsx`:

```typescript
const mockTask = createMockTask({
  title: 'Test Task',
  category: 'work',
  priority: 'high'
});

const mockEvent = createMockEvent({
  title: 'Test Event',
  startTime: new Date(),
  endTime: new Date()
});
```

### Test Database

For E2E tests:
- Use a separate test database
- Reset data between test runs
- Use factories for creating test data

### Environment Variables

```bash
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5432/dayflow_test
NEXTAUTH_URL=http://localhost:3000
```

## Debugging Tests

### Unit Tests

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Use console.log or debug statements
import { debug } from '@testing-library/react';
debug(); // Prints current DOM
```

### E2E Tests

```bash
# Run in debug mode (opens inspector)
pnpm test:e2e --debug

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Pause test execution
await page.pause();

# Take screenshot
await page.screenshot({ path: 'debug.png' });
```

### Common Issues

1. **Flaky Tests**
   - Add appropriate waits
   - Use `waitForSelector` instead of fixed timeouts
   - Check for race conditions

2. **Timeout Errors**
   - Increase timeout for slow operations
   - Ensure selectors are correct
   - Check if elements are actually rendering

3. **State Leakage**
   - Clean up after each test
   - Use `beforeEach` and `afterEach` hooks
   - Ensure tests are independent

## Best Practices

1. **Write tests first (TDD)** when possible
2. **Keep tests simple and focused**
3. **Test edge cases and error states**
4. **Maintain test code quality** (same as production code)
5. **Run tests frequently** during development
6. **Review test failures** carefully before fixing
7. **Update tests** when changing features
8. **Document complex test scenarios**

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Getting Help

If you encounter issues with tests:

1. Check this guide first
2. Review existing test examples
3. Check CI/CD logs for detailed errors
4. Ask in team chat or create an issue
5. Consult official documentation

---

**Remember**: Good tests give confidence in your code and catch bugs early. Invest time in writing quality tests!
