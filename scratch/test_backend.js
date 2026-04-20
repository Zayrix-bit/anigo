import axios from 'axios';

const PYTHON_API = "http://127.0.0.1:5000";
const BROWSE_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $format_in: [MediaFormat], $sort: [MediaSort], $seasonYear: Int, $status: MediaStatus, $genre_in: [String], $tag_in: [String], $season: MediaSeason, $country: CountryCode, $isAdult: Boolean) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, search: $search, format_in: $format_in, sort: $sort, seasonYear: $seasonYear, status: $status, genre_in: $genre_in, tag_in: $tag_in, season: $season, countryOfOrigin: $country, isAdult: $isAdult) {
        id
        title { romaji english native }
        tags { name }
      }
    }
  }
`;

async function testBackend() {
  const variables = {
    page: 1,
    perPage: 10,
    sort: ["POPULARITY_DESC"],
    tag_in: ["134"],
    isAdult: false
  };

  console.log("Testing Backend with variables:", JSON.stringify(variables, null, 2));

  try {
    const { data } = await axios.post(`${PYTHON_API}/api/anilist/proxy`, { 
      query: BROWSE_QUERY, 
      variables 
    });

    console.log("Backend Response Status:", data ? "Success" : "Empty");
    if (data.errors) {
      console.log("GraphQL Errors:", JSON.stringify(data.errors, null, 2));
    }
    
    const media = data.data?.Page?.media || data.Page?.media || [];
    console.log("Media Count:", media.length);
    
    if (media.length > 0) {
      media.forEach(m => {
        console.log(`Title: ${m.title.romaji}`);
        console.log(`Tags: ${m.tags.map(t => t.name).join(", ")}`);
      });
    } else {
      console.log("Full Data Response:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Backend Error:", err.message);
    if (err.response) {
      console.error("Response Data:", err.response.data);
    }
  }
}

testBackend();
