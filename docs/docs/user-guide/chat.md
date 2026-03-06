---
sidebar_position: 1
---

# Chat Interface

The chat interface at **http://localhost:3000/chat** allows end users to ask natural-language questions about available holiday packages.

## Starting a conversation

1. Navigate to **http://localhost:3000/chat**
2. Type your question in the input bar at the bottom of the screen
3. Press **Enter** or click **Send**

The concierge responds with a grounded answer drawn from the indexed packages, along with source citations showing which documents were used.

## Example questions

```
What beach holidays do you have under £2,000?
Which packages include flights from London?
Tell me about the Maldives option — what's included?
Is April a good time to visit Bali?
What's the best 5-star option for a honeymoon?
```

## Conversation history

The chat maintains context across messages. You can follow up naturally:

```
User:    "What does the Bali package include?"
Bot:     "The Bali Explorer includes return flights, a 5-star resort..."

User:    "How much is it for two people?"
Bot:     "Based on the Bali Explorer package, pricing starts from £1,850
          per person, so two people would be approximately £3,700."
```

Up to the last 6 conversation turns are sent with each request to maintain context.

## Source citations

Every assistant response includes **source citations** — small tags below the message showing which indexed documents were used to generate the answer. Hover over a tag to see the relevance score.

This transparency:
- Lets users verify answers against the original package description
- Identifies which packages are most relevant to a query
- Alerts users when the concierge is working from limited information

## What to do when the answer is uncertain

If the concierge says it doesn't have enough information, the relevant package may not have been indexed yet. Ask your administrator to upload it via the [Admin panel](./admin).

## Input tips

- **Be specific** — "beach holiday in Asia under £2,000 for 7 nights" returns better results than "cheap holiday"
- **Shift+Enter** — adds a newline without sending; useful for multi-line questions
- **Ask for comparisons** — "What's the difference between the Bali and Maldives packages?"
