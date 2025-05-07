import subprocess

def shell_command(command: str) -> dict:
    """Executes a shell command and returns the output.

    Args:
        command (str): The shell command to execute.

    Returns:
        dict: status and result or error msg.
    """
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True)
        return {"status": "success", "output": result.stdout.decode()}
    except subprocess.CalledProcessError as e:
        return {
            "status": "error",
            "error_message": f"Command '{command}' failed with error: {e.stderr.decode()}",
        }
