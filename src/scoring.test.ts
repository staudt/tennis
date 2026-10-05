import { describe, expect, it } from 'vitest';
import { newScore, pointLabel, pointWon, type PlayerId, type Score } from './scoring';

const play = (s: Score, ...winners: PlayerId[]) => winners.reduce(pointWon, s);
const game = (s: Score, w: PlayerId) => play(s, w, w, w, w);

describe('scoring', () => {
  it('labels 15/30/40', () => {
    let s = newScore();
    s = play(s, 0);
    expect(pointLabel(s, 0)).toBe('15');
    s = play(s, 0, 0);
    expect(pointLabel(s, 0)).toBe('40');
  });

  it('handles deuce and advantage', () => {
    let s = play(newScore(), 0, 0, 0, 1, 1, 1);
    expect(pointLabel(s, 0)).toBe('40');
    s = play(s, 0);
    expect(pointLabel(s, 0)).toBe('Ad');
    expect(pointLabel(s, 1)).toBe('40');
    s = play(s, 1);
    expect(pointLabel(s, 0)).toBe('40');
    s = play(s, 1, 1);
    expect(s.games).toEqual([0, 1]);
    expect(s.points).toEqual([0, 0]);
  });

  it('alternates server each game', () => {
    const s = game(newScore(0), 1);
    expect(s.server).toBe(1);
  });

  it('wins the set 6-4', () => {
    let s = newScore();
    for (let i = 0; i < 4; i++) s = game(game(s, 0), 1);
    s = game(game(s, 0), 0);
    expect(s.games).toEqual([6, 4]);
    expect(s.winner).toBe(0);
  });

  it('needs a two-game lead: 6-5 continues, 7-5 wins', () => {
    let s = newScore();
    for (let i = 0; i < 5; i++) s = game(game(s, 0), 1);
    s = game(s, 0);
    expect(s.winner).toBe(-1);
    s = game(s, 0);
    expect(s.games).toEqual([7, 5]);
    expect(s.winner).toBe(0);
  });

  it('plays a tiebreak at 6-6', () => {
    let s = newScore();
    for (let i = 0; i < 6; i++) s = game(game(s, 0), 1);
    expect(s.tiebreak).toBe(true);
    for (let i = 0; i < 7; i++) s = play(s, 1);
    expect(s.games).toEqual([6, 7]);
    expect(s.winner).toBe(1);
  });
});
