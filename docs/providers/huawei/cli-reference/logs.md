# Huawei Cloud - Logs

Lets you watch the logs of a specific function.

```bash
serverless logs --function functionName
```

## Options

- `--function` or `-f` The function you want to fetch the logs for. **Required**
- `--count` or `-c` The number of logs to display.

## Examples

### Retrieving logs

```bash
serverless logs --function functionName
```

This will display logs for the specified function.
