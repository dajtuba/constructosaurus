# ClaudeHopper Project Standards

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with TypeScript rules
- **Naming**: camelCase for variables/functions, PascalCase for classes

## Architecture Patterns

### Service Layer
- Services in `src/services/` handle business logic
- Keep services focused and single-purpose
- Use dependency injection where appropriate

### Processing Pipeline
- Document processors in `src/processing/`
- Each processor handles one document type
- Chain processors for complex workflows

### Storage
- LanceDB for vector storage
- Separate stores for different data types (schedules, materials, etc.)
- Use TypeScript interfaces for schema definitions

## Testing

- Unit tests for core logic
- Integration tests for pipelines
- Test files in `src/tools/test-*.ts`
- Use descriptive test names

## Documentation

- JSDoc comments for public APIs
- README files in major directories
- Keep design docs in `design-docs/`
- Update PHASE completion docs when finishing major work

## Dependencies

- Minimize external dependencies
- Prefer well-maintained packages
- Document why each dependency is needed
- Keep package.json organized by category

## Error Handling

- Use try-catch for async operations
- Log errors with context
- Provide helpful error messages
- Don't swallow errors silently

## Performance

- Cache expensive operations
- Use streaming for large files
- Batch database operations
- Profile before optimizing
