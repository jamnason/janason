export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string;
  stargazers_count: number;
  html_url: string;
  updated_at: string;
  topics: string[];
  license: {
    key: string;
    name: string;
  } | null;
}

export async function searchAiPlugins(query: string = 'topic:ai-plugin', sort: string = 'stars', page: number = 1): Promise<GithubRepo[]> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=20&page=${page}`;
    console.log('Fetching GitHub URL:', url);
    
    const headers: HeadersInit = {
      'User-Agent': 'Github-Plugin-Hub-App',
      'Accept': 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API Error:', response.status, errorData);
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];
    console.log(`Successfully fetched ${items.length} plugins from GitHub for query: "${query}"`);
    return items;
  } catch (error) {
    console.error('Error fetching plugins:', error);
    return [];
  }
}
