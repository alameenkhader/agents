import subprocess
import sys
from openai import OpenAI

client = OpenAI(
  base_url='http://localhost:11434/v1',
  api_key='ollama',  # required, but unused
)

def get_git_status(repo_path):
  """Fetch the git status of the repository."""
  result = subprocess.run(
    ['git', 'status', '--porcelain'],
    capture_output=True,
    text=True,
    check=True,
    cwd=repo_path
  )
  return result.stdout

def get_file_diff(repo_path, filename):
  """Fetch the git diff for a specific file."""
  diff_result = subprocess.run(
    ['git', 'diff', filename],
    capture_output=True,
    text=True,
    check=True,
    cwd=repo_path
  )
  return diff_result.stdout

def summarize_file_changes(client, filename, action, diff_content):
  print(action, filename, "Summarizing changes...")
  if action == 'D':
    return f"File: {filename}, Action: {action}, Summary: File deleted, no diff to summarize."

  response = client.chat.completions.create(
    model="qwen2.5-coder:14b",
    messages=[
      {"role": "system", "content": "You are a git commit message assistant."},
      {"role": "user", "content": f"Summarize the changes for the file '{filename}' with action '{action}'. Here is the diff:\n{diff_content}"}
    ],
  )
  return f"File: {filename}, Action: {action}, Summary: {response.choices[0].message.content}"

def generate_commit_message(client, summaries):
  print("Generating commit message...")
  response = client.chat.completions.create(
    model="qwen2.5-coder:14b",
    messages=[
      {"role": "system", "content": "You are a git commit message assistant."},
      {"role": "user", "content": f"Generate a concise commit message based on the following summaries:\n{summaries}. Do not use markdown"}
    ],
  )
  return response.choices[0].message.content

def main():
  if len(sys.argv) < 2:
      print("Usage: python git_changes.py <repo_path>")
      sys.exit(1)
  repo_path = sys.argv[1]
  summaries = []

  git_status = get_git_status(repo_path)
  if not git_status:
    print("No changes detected.")
    return

  for line in git_status.splitlines():
    parts = line.split()
    action, filename = parts[0], parts[1]
    if action == 'D':
      summaries.append(summarize_file_changes(client, filename, action, None))
      continue

    diff_content = get_file_diff(repo_path, filename)
    summaries.append(summarize_file_changes(client, filename, action, diff_content))

  commit_message = generate_commit_message(client, summaries)
  print("\n")
  print(commit_message)

if __name__ == "__main__":
  main()
