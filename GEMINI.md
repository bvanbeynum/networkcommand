# Global Engineering Standards (Pro-Level)

## General Coding Principles
* **Casing**: Use `camelCase` for all variables, functions, and file names.
* **Naming**: Use highly descriptive names. Single-letter variables are strictly forbidden.
* **DRY (Don't Repeat Yourself)**: Use functions to reduce duplication. Do not use for organization.
* **Predictability**: Functions must have a single responsibility. If a function does "A" and "B", split it.

## Error Handling & Logging (New)
* **Fail Fast**: Validate inputs at the very beginning of a script or function.
* **No Silent Failures**: Never use empty `except:` or `catch {}` blocks. Every error must be logged or handled.
* **Logging over Printing**: Use logging libraries (or a custom log wrapper) instead of `print()`. Logs must include a timestamp and a "level" (INFO, WARN, ERROR).
* **Graceful Exit**: If a script fails (especially on the Pi), it must exit with a non-zero status code so Docker or Cron knows it failed.

## Python Standards (Scripts & Jobs)
* **Execution**: Scripts must be inline executable.
* **Organization**: Constants and configuration loading must happen at the very top. Business logic follows.
* **SQL Handling**: Store `.sql` files in `/sql`. Python reads into a dictionary.
* **Environment**: Read from `config.js` (JSON format) at initiation.

## JavaScript & Node.js Standards
* **Syntax**: Open brace `{` on same line; close brace `}` on own line; terminate with `;`.
* **Logic**: Ternaries for simple logic; inline functions over declarations; `async/await` only.
* **Class Usage**: Only use classes for stateful objects or when required by a library.
* **Config**: Use `config.js` (JSON) and `.gitignore` it.
* **API Responses**: All Express.js endpoints must return a consistent JSON structure: `{ "success": true, "data": ..., "error": null }`.

## React.js Standards
* **Components**: Functional Components only. Single component per page unless duplicating code.
* **State Management**: Use `useState` and `useEffect` hooks cleanly. Avoid "Prop Drilling" (passing data through 5 components); use Context for global state.
* **Build**: Webpack with distinct dev and prod environments.

## MS SQL Server & Data Integrity (New)
* **Formatting**: Comma at the start of the line; `[Alias] = [Column]` leading assignment; `ON` and `WHERE` conditions on new lines.
* **Transactions**: Any script performing multiple `INSERT`, `UPDATE`, or `DELETE` operations must use a `BEGIN TRANSACTION` and `COMMIT/ROLLBACK` block.
* **Foreign Keys**: Physical foreign keys must exist in the database schema. Do not rely on application logic for referential integrity.

## Architecture & Systems
* **Roles**: Python (Jobs), JS (Web), SQL Server (Normalized Data), Mongo (Web Data).
* **Environment**: Raspberry Pi 4 (Ubuntu), Docker, Nginx (Proxy Only), NodeJS (Website).
* **Docker Standards**: Every project must have a Dockerfile and a `.dockerignore`. Images should be as small as possible (use `-alpine` variants where available).
* **Network**: Public and local web servers are Proxies. Databases are isolated from the public proxy.

## Node.js Performance (New)
* **Security**: Minimal packages. Prefer custom code to reduce attack surface.
* **Graceful Shutdown**: Node apps must listen for `SIGINT` and `SIGTERM` to close database connections before exiting.