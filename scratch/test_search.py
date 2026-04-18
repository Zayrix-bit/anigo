import requests

ANILIST_URL = "https://graphql.anilist.co"
QUERY = """
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(type: ANIME, search: $search) {
      title { romaji }
    }
  }
}
"""

def test_search(search_term):
    response = requests.post(ANILIST_URL, json={'query': QUERY, 'variables': {'search': search_term}})
    data = response.json()
    print(f"Results for '{search_term}': {data['data']['Page']['media']}")

test_search("A")
test_search("B")
