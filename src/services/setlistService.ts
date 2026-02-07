import { Setlist } from '../types';

const PHISH_NET_API = '/api';
const API_KEY = '8785ADC8148C07242439';

export interface SongInsight {
  song: string;
  probability: number;
  timesPlayed: number;
  lastPlayed: string;
  isFrequentOpener: boolean;
  isFrequentCloser: boolean;
}

interface PhishNetShow {
  showdate: string;
  venue: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  setlistdata: string;
}

interface PhishNetSong {
  song: string;
  songid: string;
  debut?: string;
  times_played?: number;
  last_played?: string;
}

interface PhishNetSetlistData {
  set1: string[];
  set2: string[];
  encore: string[];
}

// Parse Phish.net setlist format into our format
const parseSetlistData = (setlistdata: string): PhishNetSetlistData => {
  const result: PhishNetSetlistData = { set1: [], set2: [], encore: [] };
  
  if (!setlistdata) return result;

  console.log('🎵 Raw setlist data:', setlistdata);

  // Phish.net format: "Set 1: Song1, Song2, Set 2: Song3, Encore: Song4"
  // Handle Set 3 for special shows (NYE) - treat as part of Set 2
  
  // Split by set markers
  const set1Match = setlistdata.match(/Set 1:(.*?)(?=Set [23]:|Encore:|$)/i);
  const set2Match = setlistdata.match(/Set 2:(.*?)(?=Set 3:|Encore:|$)/i);
  const set3Match = setlistdata.match(/Set 3:(.*?)(?=Encore:|$)/i);
  const encoreMatch = setlistdata.match(/Encore:(.*?)$/i);

  const cleanSong = (song: string): string => {
    return song
      .replace(/\[.*?\]/g, '') // Remove [1], [2], etc.
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  };

  const parseSongList = (text: string): string[] => {
    if (!text) return [];
    
    return text
      .split(',')
      .flatMap(segment => {
        // Split songs connected by > (e.g., "Sand > Fuego > No Men")
        return segment.split('>').map(s => cleanSong(s));
      })
      .filter(s => s.length > 0);
  };

  if (set1Match) {
    result.set1 = parseSongList(set1Match[1]);
  }

  if (set2Match) {
    result.set2 = parseSongList(set2Match[1]);
  }

  // For NYE and special shows, add Set 3 to Set 2
  if (set3Match) {
    const set3Songs = parseSongList(set3Match[1]);
    result.set2 = [...result.set2, ...set3Songs];
  }

  if (encoreMatch) {
    result.encore = parseSongList(encoreMatch[1]);
  }

  console.log('✅ Parsed setlist:', result);
  
  return result;
};

// Fetch complete song list from Phish.net
export const fetchAllSongs = async (): Promise<SongInsight[]> => {
  try {
    console.log('🎵 Fetching complete Phish song catalog...');
    
    const response = await fetch(`${PHISH_NET_API}/songs.json?apikey=${API_KEY}`);
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️ No songs found');
      return [];
    }

    const songs = data.data as PhishNetSong[];
    console.log(`✅ Loaded ${songs.length} songs from Phish.net`);

    // Estimated total Phish shows (as of 2024: ~3500 shows)
    const ESTIMATED_TOTAL_SHOWS = 3500;

    // Convert to SongInsight format for autocomplete with calculated probabilities
    const insights: SongInsight[] = songs.map(song => {
      const timesPlayed = song.times_played || 0;
      const probability = Math.round((timesPlayed / ESTIMATED_TOTAL_SHOWS) * 100);
      
      return {
        song: song.song,
        probability: Math.min(probability, 100), // Cap at 100%
        timesPlayed: timesPlayed,
        lastPlayed: song.last_played || song.debut || '',
        isFrequentOpener: false,
        isFrequentCloser: false
      };
    });

    // Sort by probability (highest first) for better autocomplete
    const sorted = insights.sort((a, b) => b.probability - a.probability);
    
    console.log(`📊 Top 10 songs by probability:`, sorted.slice(0, 10).map(s => `${s.song} (${s.probability}%)`));

    return sorted;
    
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
};

// Fetch recent tour stats (last 3 months) for accurate current probabilities
export const fetchRecentTourStats = async (): Promise<SongInsight[]> => {
  try {
    console.log('🔄 Fetching recent tour stats (last 3 months)...');
    
    // Check cache first (refresh once per day)
    const cacheKey = 'phish_recent_tour_stats';
    const cacheTimestamp = 'phish_recent_tour_timestamp';
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(cacheTimestamp);
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (cached && timestamp && parseInt(timestamp) > oneDayAgo) {
      console.log('✅ Using cached recent tour stats');
      return JSON.parse(cached);
    }
    
    // Get current date and 3 months ago
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    const currentYear = today.getFullYear();
    const prevYear = threeMonthsAgo.getFullYear();
    
    // Fetch shows from current year and previous year (to cover 3 month window)
    const allShows: PhishNetShow[] = [];
    const yearsToFetch = [prevYear, currentYear];
    
    for (const year of yearsToFetch) {
      try {
        const response = await fetch(`${PHISH_NET_API}/shows/showyear/${year}.json?apikey=${API_KEY}&order_by=showdate`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          allShows.push(...data.data);
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch ${year} data:`, error);
      }
    }
    
    // Filter to last 3 months only
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    const recentShows = allShows.filter(show => 
      show.showdate >= threeMonthsAgoStr && show.setlistdata
    );
    
    console.log(`📅 Found ${recentShows.length} shows in last 3 months`);
    
    if (recentShows.length === 0) {
      console.log('⚠️ No recent shows found, using all-time stats');
      return [];
    }
    
    // Parse all setlists and collect song statistics
    const songStats: Map<string, {
      count: number;
      lastPlayed: string;
      openerCount: number;
      set1CloserCount: number;
      set2OpenerCount: number;
      set2CloserCount: number;
      encoreCount: number;
    }> = new Map();

    recentShows.forEach(show => {
      const parsed = parseSetlistData(show.setlistdata);
      const allSongs = [...parsed.set1, ...parsed.set2, ...parsed.encore];
      
      allSongs.forEach(song => {
        if (!song) return;
        
        const existing = songStats.get(song) || {
          count: 0,
          lastPlayed: '',
          openerCount: 0,
          set1CloserCount: 0,
          set2OpenerCount: 0,
          set2CloserCount: 0,
          encoreCount: 0
        };
        
        existing.count++;
        
        if (!existing.lastPlayed || show.showdate > existing.lastPlayed) {
          existing.lastPlayed = show.showdate;
        }
        
        // Track position-specific stats
        if (parsed.set1[0] === song) existing.openerCount++;
        if (parsed.set1[parsed.set1.length - 1] === song) existing.set1CloserCount++;
        if (parsed.set2[0] === song) existing.set2OpenerCount++;
        if (parsed.set2[parsed.set2.length - 1] === song) existing.set2CloserCount++;
        if (parsed.encore.includes(song)) existing.encoreCount++;
        
        songStats.set(song, existing);
      });
    });

    console.log(`🎵 Tracked ${songStats.size} unique songs in recent rotation`);

    // Calculate probabilities based on recent shows
    const insights: SongInsight[] = [];
    
    songStats.forEach((stats, song) => {
      const probability = Math.round((stats.count / recentShows.length) * 100);
      const isFrequentOpener = stats.openerCount >= 2;
      const isFrequentCloser = (stats.set1CloserCount + stats.set2CloserCount) >= 2;
      
      insights.push({
        song,
        probability,
        timesPlayed: stats.count,
        lastPlayed: stats.lastPlayed,
        isFrequentOpener,
        isFrequentCloser
      });
    });

    // Sort by probability (highest first)
    const sorted = insights.sort((a, b) => b.probability - a.probability);
    
    console.log(`📈 Recent top 10 songs:`, sorted.slice(0, 10).map(s => `${s.song} (${s.probability}%)`));
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(sorted));
    localStorage.setItem(cacheTimestamp, Date.now().toString());
    
    return sorted;
    
  } catch (error) {
    console.error('Error fetching recent tour stats:', error);
    return [];
  }
};

// Fetch a specific show's setlist
export const fetchLiveSetlist = async (date: string): Promise<{ setlist: Setlist } | null> => {
  try {
    console.log('🎤 Fetching setlist for:', date);
    const response = await fetch(`${PHISH_NET_API}/setlists/showdate/${date}.json?apikey=${API_KEY}`);
    const data = await response.json();
    
    console.log('📦 API Response:', data);
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️ No setlist found for this date');
      return null;
    }

    // The /setlists/ endpoint returns an array of song objects
    const songs = data.data;
    console.log(`🎸 Found ${songs.length} songs in setlist`);
    
    // Group songs by set
    const set1Songs: Array<{song: string, position: number}> = [];
    const set2Songs: Array<{song: string, position: number}> = [];
    const set3Songs: Array<{song: string, position: number}> = [];
    const encoreSongs: Array<{song: string, position: number}> = [];
    
    songs.forEach((item: any) => {
      const songName = item.song || '';
      const setNum = item.set || '';
      const position = parseInt(item.position) || 0;
      
      if (!songName) return;
      
      if (setNum === '1') {
        set1Songs.push({ song: songName, position });
      } else if (setNum === '2') {
        set2Songs.push({ song: songName, position });
      } else if (setNum === '3') {
        set3Songs.push({ song: songName, position });
      } else if (setNum === 'E') {
        encoreSongs.push({ song: songName, position });
      }
    });
    
    // Sort by position
    const sortByPosition = (a: {position: number}, b: {position: number}) => a.position - b.position;
    
    set1Songs.sort(sortByPosition);
    set2Songs.sort(sortByPosition);
    set3Songs.sort(sortByPosition);
    encoreSongs.sort(sortByPosition);
    
    // Combine Set 2 and Set 3 (for NYE shows)
    const combinedSet2 = [
      ...set2Songs.map(s => s.song),
      ...set3Songs.map(s => s.song)
    ];
    
    const result = {
      setlist: {
        set1: set1Songs.map(s => s.song),
        set2: combinedSet2,
        encore: encoreSongs.map(s => s.song)
      }
    };
    
    console.log('✅ Parsed setlist:', result.setlist);
    console.log('📊 Set 1:', result.setlist.set1.length, 'songs');
    console.log('📊 Set 2:', result.setlist.set2.length, 'songs');
    console.log('📊 Encore:', result.setlist.encore.length, 'songs');
    
    return result;
    
  } catch (error) {
    console.error('❌ Error fetching setlist:', error);
    return null;
  }
};

// Fetch show details (venue info)
export const fetchShowDetails = async (date: string): Promise<string | null> => {
  try {
    const response = await fetch(`${PHISH_NET_API}/shows/showdate/${date}.json?apikey=${API_KEY}`);
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return null;
    }

    const show = data.data[0] as PhishNetShow;
    
    // Build location string from available fields
    let locationStr = '';
    if (show.location) {
      locationStr = show.location;
    } else {
      const parts = [];
      if (show.city) parts.push(show.city);
      if (show.state) parts.push(show.state);
      if (show.country && show.country !== 'USA') parts.push(show.country);
      locationStr = parts.join(', ');
    }
    
    return `${show.venue}, ${locationStr}`;
  } catch (error) {
    console.error('Error fetching show details:', error);
    return null;
  }
};

// Fetch tour insights and calculate probabilities (for "Refresh Stats" button)
export const fetchTourInsights = async (targetDate: string): Promise<SongInsight[]> => {
  try {
    // Get the year from target date and use LAST 10 YEARS for stats
    const targetYear = parseInt(targetDate.split('-')[0]);
    const startYear = targetYear - 10;
    const endYear = targetYear - 1; // Up to previous year
    
    console.log(`🎸 Fetching tour stats from ${startYear}-${endYear} (10 years) for ${targetDate} show`);
    
    // Fetch shows from each of the last 10 years
    const allShows: PhishNetShow[] = [];
    
    for (let year = startYear; year <= endYear; year++) {
      try {
        const response = await fetch(`${PHISH_NET_API}/shows/showyear/${year}.json?apikey=${API_KEY}&order_by=showdate`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          allShows.push(...data.data);
          console.log(`📅 ${year}: Found ${data.data.length} shows`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch ${year} data:`, error);
      }
    }
    
    console.log(`📊 Total shows found: ${allShows.length}`);
    
    if (allShows.length === 0) {
      console.log('⚠️ No tour data found for the last 10 years');
      return [];
    }

    // Use ALL shows from the last 10 years with setlists
    const tourShows = allShows.filter(show => show.setlistdata);
    
    console.log(`✅ Analyzing ${tourShows.length} shows with setlists`);
    
    if (tourShows.length === 0) {
      return [];
    }

    // Parse all setlists and collect song statistics
    const songStats: Map<string, {
      count: number;
      lastPlayed: string;
      openerCount: number;
      set1CloserCount: number;
      set2OpenerCount: number;
      set2CloserCount: number;
      encoreCount: number;
    }> = new Map();

    tourShows.forEach(show => {
      const parsed = parseSetlistData(show.setlistdata);
      const allSongs = [...parsed.set1, ...parsed.set2, ...parsed.encore];
      
      allSongs.forEach(song => {
        if (!song) return;
        
        const existing = songStats.get(song) || {
          count: 0,
          lastPlayed: '',
          openerCount: 0,
          set1CloserCount: 0,
          set2OpenerCount: 0,
          set2CloserCount: 0,
          encoreCount: 0
        };
        
        existing.count++;
        
        // Track most recent play date
        if (!existing.lastPlayed || show.showdate > existing.lastPlayed) {
          existing.lastPlayed = show.showdate;
        }
        
        // Track position-specific stats
        if (parsed.set1[0] === song) existing.openerCount++;
        if (parsed.set1[parsed.set1.length - 1] === song) existing.set1CloserCount++;
        if (parsed.set2[0] === song) existing.set2OpenerCount++;
        if (parsed.set2[parsed.set2.length - 1] === song) existing.set2CloserCount++;
        if (parsed.encore.includes(song)) existing.encoreCount++;
        
        songStats.set(song, existing);
      });
    });

    console.log(`🎵 Tracked ${songStats.size} unique songs`);

    // Calculate probabilities and create insights
    const insights: SongInsight[] = [];
    
    songStats.forEach((stats, song) => {
      // Probability based on how often played across all shows
      const probability = Math.round((stats.count / tourShows.length) * 100);
      const isFrequentOpener = stats.openerCount >= 5; // At least 5 times as opener in 10 years
      const isFrequentCloser = (stats.set1CloserCount + stats.set2CloserCount) >= 5; // At least 5 times as closer
      
      insights.push({
        song,
        probability,
        timesPlayed: stats.count,
        lastPlayed: stats.lastPlayed,
        isFrequentOpener,
        isFrequentCloser
      });
    });

    // Sort by probability (highest first)
    const sorted = insights.sort((a, b) => b.probability - a.probability);
    
    console.log(`📈 Top 10 songs:`, sorted.slice(0, 10).map(s => `${s.song} (${s.probability}%)`));
    
    return sorted;
    
  } catch (error) {
    console.error('Error fetching tour insights:', error);
    return [];
  }
};