# DayFlow Test Suite Documentation

This document provides comprehensive information about the test suite for the DayFlow daily planner application.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Testing Patterns](#testing-patterns)
- [What's Tested](#whats-tested)
- [Writing New Tests](#writing-new-tests)

## 🎯 Overview

The DayFlow test suite uses **Jest** and **React Testing Library** to provide comprehensive unit test coverage for the application. The tests focus on:

- **Utility Functions**: Business logic and helper functions
- **Validation**: Zod schema validation for tasks and events
- **Hooks**: Custom React hooks for state management
- **Store**: Zustand state management
- **Components**: UI components (examples provided)

## 📁 Test Structure

```
tests/
├── unit/                          # Unit tests
│   ├── components/                # Component tests
│   │   ├── CalendarGrid.test.tsx  # Calendar grid component
│   │   └── TaskItem.test.tsx      # Task item component
│   ├── hooks/                     # Custom hooks tests
│   │   ├── useCalendar.test.ts    # Calendar hook
│   │   ├── useTasks.test.ts       # Tasks hook
│   │   └── useTheme.test.ts       # Theme hook
│   ├── lib/                       # Utility functions tests
│   │   ├── calendar-utils.test.ts # Calendar utilities
│   │   ├── task-utils.test.ts     # Task utilities
│   │   ├── conflict-detection.test.ts # Conflict detection
│   │   └── view-transitions.test.ts   # View transitions
│   ├── store/                     # State management tests
│   │   └── store.test.ts          # Zustand store
│   └── validations/               # Schema validation tests
│       └── task-event.test.ts     # Task/Event schemas
├── utils/                         # Test utilities
│   └── test-utils.tsx             # Helper functions & mocks
├── e2e/                          # E2E tests (Playwright)
│   └── example.spec.ts
└── README.md                      # This file
```

## 🚀 Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test File

```bash
npm test calendar-utils.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="calculates duration"
```

### Run E2E Tests

```bash
npm run test:e2e
```

## 📊 Test Coverage

### Current Coverage Targets

| Category              | Target | Current                |
| --------------------- | ------ | ---------------------- |
| **Overall**           | 80%+   | ✅                     |
| **Utility Functions** | 100%   | ✅                     |
| **Hooks**             | 90%+   | ✅                     |
| **Store**             | 95%+   | ✅                     |
| **Validations**       | 100%   | ✅                     |
| **Components**        | 75%+   | 🚧 (Examples provided) |

### View Coverage Report

After running tests with coverage, open:

```bash
open coverage/lcov-report/index.html
```

## 🧪 Testing Patterns

### 1. Utility Function Tests

**Pattern**: Pure function testing with various inputs

```typescript
describe("functionName", () => {
  it("handles normal case", () => {
    expect(functionName(input)).toBe(expected);
  });

  it("handles edge case", () => {
    expect(functionName(edgeInput)).toBe(edgeExpected);
  });

  it("handles error case", () => {
    expect(() => functionName(invalidInput)).toThrow();
  });
});
```

### 2. Hook Tests

**Pattern**: Use `renderHook` from React Testing Library

```typescript
describe("useCustomHook", () => {
  it("returns expected values", () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.value).toBeDefined();
  });

  it("updates on action", () => {
    const { result } = renderHook(() => useCustomHook());
    act(() => {
      result.current.action();
    });
    expect(result.current.value).toBe(newValue);
  });
});
```

### 3. Component Tests

**Pattern**: Test user interactions and rendered output

```typescript
describe("Component", () => {
  it("renders correctly", () => {
    renderWithProviders(<Component />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Component />);

    await user.click(screen.getByRole("button"));
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

### 4. Store Tests

**Pattern**: Test state mutations and side effects

```typescript
describe("store", () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState(initialState);
  });

  it("updates state correctly", () => {
    useAppStore.getState().action(data);
    expect(useAppStore.getState().value).toBe(expected);
  });
});
```

## ✅ What's Tested

### Utility Functions (100% Coverage)

**Calendar Utils** (`src/lib/calendar-utils.ts`)

- ✅ Week date calculations
- ✅ Time formatting (12h and 24h)
- ✅ Event position calculations
- ✅ Overlap detection
- ✅ Current time positioning
- ✅ Date navigation
- ✅ Business hours validation

**Task Utils** (`src/lib/task-utils.ts`)

- ✅ Overdue detection
- ✅ Subtask progress calculation
- ✅ Task sorting (priority, date)
- ✅ Task filtering (category, completion)
- ✅ Task grouping by date
- ✅ Category counting
- ✅ Date formatting

**Conflict Detection** (`src/lib/conflict-detection.ts`)

- ✅ Time interval overlap detection
- ✅ Conflict checking with events/tasks
- ✅ Next available slot finding
- ✅ Event range queries
- ✅ Duration calculations
- ✅ Conflict message formatting

**View Transitions** (`src/lib/view-transitions.ts`)

- ✅ API support detection
- ✅ Transition execution
- ✅ Theme transitions
- ✅ Circular reveal animations
- ✅ Fallback handling

### Validations (100% Coverage)

**Schemas** (`src/lib/validations/task-event.ts`)

- ✅ Category validation
- ✅ Priority validation
- ✅ Task form validation
- ✅ Event form validation
- ✅ Subtask validation
- ✅ Attendee validation
- ✅ Quick add validation
- ✅ Custom validation rules
- ✅ Error message generation

### Hooks (90%+ Coverage)

**useCalendar** (`src/hooks/useCalendar.ts`)

- ✅ Time block conversion
- ✅ Week date retrieval
- ✅ Date navigation
- ✅ View mode changes
- ✅ Event/task filtering

**useTasks** (`src/hooks/useTasks.ts`)

- ✅ Task filtering (category, priority, completion)
- ✅ Overdue task calculation
- ✅ Today's tasks
- ✅ Upcoming tasks
- ✅ Statistics calculation
- ✅ Date range filtering

**useTheme** (`src/hooks/useTheme.ts`)

- ✅ Theme detection
- ✅ Theme switching
- ✅ System preference detection
- ✅ LocalStorage persistence
- ✅ Class application

### Store (95%+ Coverage)

**Zustand Store** (`src/lib/store.ts`)

- ✅ UI state management
- ✅ Modal state management
- ✅ Task CRUD operations
- ✅ Event CRUD operations
- ✅ Drag state management
- ✅ Conflict detection
- ✅ Task scheduling
- ✅ Event moving
- ✅ Filter management

### Components (Examples Provided)

**CalendarGrid** (`src/components/calendar/CalendarGrid.tsx`)

- ✅ 7-day week rendering
- ✅ Hourly time blocks
- ✅ Current time indicator
- ✅ Time slot clicks
- ✅ Block positioning
- ✅ Overlap handling

**TaskItem** (`src/components/tasks/TaskItem.tsx`)

- ✅ Task details rendering
- ✅ Checkbox toggle
- ✅ Subtask progress
- ✅ Priority badges
- ✅ Due date display
- ✅ Expand/collapse

## 📝 Writing New Tests

### 1. Use Test Utilities

```typescript
import {
  renderWithProviders,
  createMockTask,
  createMockEvent,
  setMockDate,
  restoreRealDate,
} from "../../utils/test-utils";
```

### 2. Mock Time When Needed

```typescript
beforeEach(() => {
  setMockDate("2024-01-15T12:00:00");
});

afterEach(() => {
  restoreRealDate();
});
```

### 3. Use Accessible Queries

Prefer queries in this order:

1. `getByRole` - Most accessible
2. `getByLabelText` - For form fields
3. `getByText` - For text content
4. `getByTestId` - Last resort

### 4. Test User Behavior

```typescript
it("completes task on checkbox click", async () => {
  const user = userEvent.setup();
  renderWithProviders(<TaskItem task={mockTask} />);

  await user.click(screen.getByRole("checkbox"));

  expect(mockToggleComplete).toHaveBeenCalledWith(mockTask.id);
});
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
  restoreRealDate();
});
```

## 🎨 Test Utilities

### Mock Data Factories

```typescript
// Create mock task
const task = createMockTask({
  title: "Custom Title",
  priority: "high",
});

// Create mock event
const event = createMockEvent({
  startTime: new Date("2024-01-01T09:00:00"),
  endTime: new Date("2024-01-01T10:00:00"),
});

// Create mock time block
const block = createMockTimeBlock({
  type: "event",
  startTime: new Date(),
});
```

### Custom Render

```typescript
// Render with DnD context
renderWithProviders(<Component />, { withDnd: true });

// Render with theme provider
renderWithProviders(<Component />, { withTheme: true });

// Render with both
renderWithProviders(<Component />, {
  withDnd: true,
  withTheme: true,
});
```

### Date Mocking

```typescript
// Mock current date/time
setMockDate("2024-01-15T12:00:00");

// Create relative dates
const tomorrow = createDate(1, 9, 0); // 1 day from now, 9 AM
```

## 🐛 Debugging Tests

### Run Single Test

```bash
npm test -- -t "test name"
```

### Run in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### View Test Output

```bash
npm test -- --verbose
```

### Check Coverage for Specific File

```bash
npm test -- --coverage --collectCoverageFrom="src/lib/task-utils.ts"
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Documentation](https://playwright.dev/)

## 🚧 Areas for Expansion

While core functionality has comprehensive coverage, additional tests could be added for:

- **More Component Tests**: WeekView, TaskSidebar, TaskList, TimeBlock
- **Modal Components**: TaskModal, EventModal, QuickAddModal
- **Integration Tests**: Multi-component interactions
- **Accessibility Tests**: ARIA labels, keyboard navigation
- **Performance Tests**: Large dataset handling

Use the provided component test examples as templates for these additional tests.

## 💡 Tips

1. **Keep tests focused**: One concept per test
2. **Use descriptive names**: Test names should explain what's being tested
3. **Avoid implementation details**: Test behavior, not internals
4. **Mock external dependencies**: Keep tests isolated
5. **Test edge cases**: Don't just test the happy path
6. **Maintain test data**: Use factories for consistent mock data
7. **Run tests frequently**: Use watch mode during development

---

**Last Updated**: 2024-01-15
**Test Framework**: Jest 29 + React Testing Library 16
**Node Version**: 22.x
**Coverage Target**: 80%+
