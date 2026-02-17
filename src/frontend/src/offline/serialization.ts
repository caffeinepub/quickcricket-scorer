// Serialization helpers for storing backend types in browser storage
// Handles BigInt-safe JSON encoding/decoding with proper Principal handling

import type { Match, Innings, Ball, Team, Player, BallExtras } from '../backend';

interface SerializedMatch {
  id: string;
  owner: string;
  teams: SerializedTeam[];
  innings: SerializedInnings[];
  oversPerInnings: string | null;
  _localOnly?: boolean;
  _lastModified?: number;
}

interface SerializedTeam {
  id: string;
  name: string;
  players: SerializedPlayer[];
}

interface SerializedPlayer {
  id: string;
  name: string;
  battingOrderPosition: string | null;
}

interface SerializedInnings {
  battingTeam: SerializedTeam;
  bowlingTeam: SerializedTeam;
  balls: SerializedBall[];
  totalRuns: string;
  totalWickets: string;
  overs: string | null;
  ballsInCurrentOver: string;
}

interface SerializedBall {
  ballNumber: string;
  batsman: SerializedPlayer;
  bowler: SerializedPlayer;
  runs: string;
  isWicket: boolean;
  extras: SerializedBallExtras | null;
}

interface SerializedBallExtras {
  wide: boolean;
  noBall: boolean;
  byes: string;
  legByes: string;
  legalDelivery: boolean;
}

export function serializeMatch(match: Match, localOnly = false): string {
  const serialized: SerializedMatch = {
    id: match.id.toString(),
    owner: match.owner.toString(),
    teams: match.teams.map(serializeTeam),
    innings: match.innings.map(serializeInnings),
    oversPerInnings: match.oversPerInnings?.toString() ?? null,
    _localOnly: localOnly,
    _lastModified: Date.now(),
  };
  return JSON.stringify(serialized);
}

export function deserializeMatch(json: string): Match & { _localOnly?: boolean } {
  const data: SerializedMatch = JSON.parse(json);
  return {
    id: BigInt(data.id),
    owner: data.owner as any, // Principal string representation
    teams: data.teams.map(deserializeTeam),
    innings: data.innings.map(deserializeInnings),
    oversPerInnings: data.oversPerInnings ? BigInt(data.oversPerInnings) : undefined,
    _localOnly: data._localOnly,
  };
}

function serializeTeam(team: Team): SerializedTeam {
  return {
    id: team.id.toString(),
    name: team.name,
    players: team.players.map(serializePlayer),
  };
}

function deserializeTeam(team: SerializedTeam): Team {
  return {
    id: BigInt(team.id),
    name: team.name,
    players: team.players.map(deserializePlayer),
  };
}

function serializePlayer(player: Player): SerializedPlayer {
  return {
    id: player.id.toString(),
    name: player.name,
    battingOrderPosition: player.battingOrderPosition?.toString() ?? null,
  };
}

function deserializePlayer(player: SerializedPlayer): Player {
  return {
    id: BigInt(player.id),
    name: player.name,
    battingOrderPosition: player.battingOrderPosition ? BigInt(player.battingOrderPosition) : undefined,
  };
}

function serializeInnings(innings: Innings): SerializedInnings {
  return {
    battingTeam: serializeTeam(innings.battingTeam),
    bowlingTeam: serializeTeam(innings.bowlingTeam),
    balls: innings.balls.map(serializeBall),
    totalRuns: innings.totalRuns.toString(),
    totalWickets: innings.totalWickets.toString(),
    overs: innings.overs?.toString() ?? null,
    ballsInCurrentOver: innings.ballsInCurrentOver.toString(),
  };
}

function deserializeInnings(innings: SerializedInnings): Innings {
  return {
    battingTeam: deserializeTeam(innings.battingTeam),
    bowlingTeam: deserializeTeam(innings.bowlingTeam),
    balls: innings.balls.map(deserializeBall),
    totalRuns: BigInt(innings.totalRuns),
    totalWickets: BigInt(innings.totalWickets),
    overs: innings.overs ? BigInt(innings.overs) : undefined,
    ballsInCurrentOver: BigInt(innings.ballsInCurrentOver),
  };
}

function serializeBall(ball: Ball): SerializedBall {
  return {
    ballNumber: ball.ballNumber.toString(),
    batsman: serializePlayer(ball.batsman),
    bowler: serializePlayer(ball.bowler),
    runs: ball.runs.toString(),
    isWicket: ball.isWicket,
    extras: ball.extras ? serializeExtras(ball.extras) : null,
  };
}

function deserializeBall(ball: SerializedBall): Ball {
  return {
    ballNumber: BigInt(ball.ballNumber),
    batsman: deserializePlayer(ball.batsman),
    bowler: deserializePlayer(ball.bowler),
    runs: BigInt(ball.runs),
    isWicket: ball.isWicket,
    extras: ball.extras ? deserializeExtras(ball.extras) : undefined,
  };
}

function serializeExtras(extras: BallExtras): SerializedBallExtras {
  return {
    wide: extras.wide,
    noBall: extras.noBall,
    byes: extras.byes.toString(),
    legByes: extras.legByes.toString(),
    legalDelivery: extras.legalDelivery,
  };
}

function deserializeExtras(extras: SerializedBallExtras): BallExtras {
  return {
    wide: extras.wide,
    noBall: extras.noBall,
    byes: BigInt(extras.byes),
    legByes: BigInt(extras.legByes),
    legalDelivery: extras.legalDelivery,
  };
}
