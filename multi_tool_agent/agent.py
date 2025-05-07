from openai import OpenAI
import json
import subprocess

def get_changes():
  result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
  return result.stdout

def get_weather(city):
    """Simulates fetching weather data for a given city."""
    sample_weather={
            "New York": {"temperature": 22, "condition": "sunny"},
            "London": {"temperature": 26, "condition": "cloudy"}
    }
    return sample_weather.get(city, {"temperature": "Unknown", "condition": "Unknown"})

client = OpenAI(
    base_url = 'http://localhost:11434/v1',
    api_key='ollama', # required, but unused
)

response = client.chat.completions.create(
  model="qwen2.5-coder:14b",
  messages=[
    {"role": "system", "content": "You are a weather assistant."},
    {"role": "user", "content": "Whats the weather like in London"}
  ],
  tools=[
    {
            'type': 'function',
      'function': {
        'name': 'get_weather',
        'description': 'Get the current weather for a city',
        'parameters': {
          'type': 'object',
          'properties': {
            'city': {
              'type': 'string',
              'description': 'The name of the city',
            },
          },
          'required': ['city'],
        },
      },
    }
   ],
    tool_choice="auto"
)

print(response)

message = response.choices[0].message
if message.tool_calls:
    tool_call = message.tool_calls[0]
    function_name = tool_call.function.name
    arguments = json.loads(tool_call.function.arguments)

    if function_name == "get_weather":
        result = get_weather(arguments["city"])
        print(f"Weather in {arguments['city']}: {result['temperature']}°C, {result['condition']}")

