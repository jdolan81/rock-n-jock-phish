import { SongPicks, Setlist, ScoreBreakdown } from '../types';

// Normalize song names for comparison (case-insensitive, trim whitespace)
const normalizeSong = (song: string): string => {
  return song.toLowerCase().trim();
};

export const calculatePlayerScore = (
  picks: SongPicks,
  setlist: Setlist
): { score: number; breakdown: ScoreBreakdown } => {
  let score = 0;
  const breakdown: ScoreBreakdown = {
    opener: false,
    set1Closer: false,
    set2Opener: false,
    set2Closer: false,
    encore: false,
    wildcards: [false, false],
    rockNJock: false
  };

  console.log('🎯 Calculating score for picks:', picks);
  console.log('📋 Actual setlist:', setlist);

  // Normalize all songs in setlist
  const normalizedSet1 = setlist.set1.map(normalizeSong);
  const normalizedSet2 = setlist.set2.map(normalizeSong);
  const normalizedEncore = setlist.encore.map(normalizeSong);
  const allSongs = [...normalizedSet1, ...normalizedSet2, ...normalizedEncore];

  // Check Opener (first song of Set 1) - 2 points
  if (setlist.set1.length > 0) {
    const actualOpener = normalizedSet1[0];
    const pickedOpener = normalizeSong(picks.opener);
    
    if (actualOpener === pickedOpener) {
      score += 2;
      breakdown.opener = true;
      console.log('✅ Opener match:', picks.opener, '(+2 pts)');
    } else {
      console.log('❌ Opener miss. Picked:', picks.opener, 'Actual:', setlist.set1[0]);
    }
  }

  // Check Set 1 Closer (last song of Set 1) - 2 points
  if (setlist.set1.length > 0) {
    const actualS1Closer = normalizedSet1[normalizedSet1.length - 1];
    const pickedS1Closer = normalizeSong(picks.set1Closer);
    
    if (actualS1Closer === pickedS1Closer) {
      score += 2;
      breakdown.set1Closer = true;
      console.log('✅ S1 Closer match:', picks.set1Closer, '(+2 pts)');
    } else {
      console.log('❌ S1 Closer miss. Picked:', picks.set1Closer, 'Actual:', setlist.set1[setlist.set1.length - 1]);
    }
  }

  // Check Set 2 Opener (first song of Set 2) - 2 points
  if (setlist.set2.length > 0) {
    const actualS2Opener = normalizedSet2[0];
    const pickedS2Opener = normalizeSong(picks.set2Opener);
    
    if (actualS2Opener === pickedS2Opener) {
      score += 2;
      breakdown.set2Opener = true;
      console.log('✅ S2 Opener match:', picks.set2Opener, '(+2 pts)');
    } else {
      console.log('❌ S2 Opener miss. Picked:', picks.set2Opener, 'Actual:', setlist.set2[0]);
    }
  }

  // Check Set 2 Closer (last song of Set 2) - 2 points
  if (setlist.set2.length > 0) {
    const actualS2Closer = normalizedSet2[normalizedSet2.length - 1];
    const pickedS2Closer = normalizeSong(picks.set2Closer);
    
    if (actualS2Closer === pickedS2Closer) {
      score += 2;
      breakdown.set2Closer = true;
      console.log('✅ S2 Closer match:', picks.set2Closer, '(+2 pts)');
    } else {
      console.log('❌ S2 Closer miss. Picked:', picks.set2Closer, 'Actual:', setlist.set2[setlist.set2.length - 1]);
    }
  }

  // Check Encore (ANY song in encore) - 2 points
  const pickedEncore = normalizeSong(picks.encore);
  if (normalizedEncore.includes(pickedEncore)) {
    score += 2;
    breakdown.encore = true;
    console.log('✅ Encore match:', picks.encore, '(+2 pts)');
  } else {
    console.log('❌ Encore miss. Picked:', picks.encore, 'Actual encore songs:', setlist.encore);
  }

  // Check Wildcards (ANY song in entire show) - 1 point each
  picks.wildcards.forEach((wildcard, index) => {
    const normalized = normalizeSong(wildcard);
    if (normalized && allSongs.includes(normalized)) {
      score += 1;
      breakdown.wildcards[index] = true;
      console.log(`✅ Wildcard ${index + 1} match:`, wildcard, '(+1 pt)');
    } else {
      console.log(`❌ Wildcard ${index + 1} miss:`, wildcard);
    }
  });

  // Check Rock n Jock (exact song + set + position) - 5 points
  if (picks.rockNJock.song && picks.rockNJock.set && picks.rockNJock.position) {
    const targetSet = picks.rockNJock.set === '1' ? normalizedSet1 : normalizedSet2;
    const actualSet = picks.rockNJock.set === '1' ? setlist.set1 : setlist.set2;
    const pickedSong = normalizeSong(picks.rockNJock.song);
    const position = picks.rockNJock.position - 1; // Convert to 0-indexed
    
    if (position >= 0 && position < targetSet.length && targetSet[position] === pickedSong) {
      score += 5;
      breakdown.rockNJock = true;
      console.log(`✅ Rock n Jock match: ${picks.rockNJock.song} - Set ${picks.rockNJock.set} Position ${picks.rockNJock.position} (+5 pts)`);
    } else {
      console.log(`❌ Rock n Jock miss. Picked: ${picks.rockNJock.song} Set ${picks.rockNJock.set} Pos ${picks.rockNJock.position}. Actual: ${actualSet[position] || 'N/A'}`);
    }
  }

  console.log('📊 Final score:', score, 'Breakdown:', breakdown);

  return { score, breakdown };
};