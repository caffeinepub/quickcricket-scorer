import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    id: bigint;
    name: string;
    battingOrderPosition?: bigint;
}
export interface PersistentPlayerStats {
    bowlingStats: BowlingStats;
    battingStats: BattingStats;
    lastUpdated: Time;
    playerName: string;
    matchesPlayed: bigint;
}
export type Time = bigint;
export interface SavedTeam {
    owner: Principal;
    createdAt: Time;
    team: Team;
    updatedAt: Time;
}
export interface BattingStats {
    fours: bigint;
    outs: bigint;
    runs: bigint;
    sixes: bigint;
    ballsFaced: bigint;
}
export interface Ball {
    ballNumber: bigint;
    runs: bigint;
    bowler: Player;
    isWicket: boolean;
    extras?: BallExtras;
    batsman: Player;
}
export interface BowlingStats {
    maidens: bigint;
    wickets: bigint;
    ballsBowled: bigint;
    runsConceded: bigint;
}
export interface Match {
    id: bigint;
    teams: Array<Team>;
    owner: Principal;
    oversPerInnings?: bigint;
    toss?: TossInfo;
    innings: Array<Innings>;
}
export interface TossInfo {
    decision: TossDecision;
    winnerTeamId: bigint;
}
export interface BallExtras {
    noBall: boolean;
    byes: bigint;
    wide: boolean;
    legByes: bigint;
    legalDelivery: boolean;
}
export interface Innings {
    overs?: bigint;
    totalWickets: bigint;
    battingTeam: Team;
    totalRuns: bigint;
    bowlingTeam: Team;
    ballsInCurrentOver: bigint;
    balls: Array<Ball>;
}
export interface UserProfile {
    name: string;
}
export interface Team {
    id: bigint;
    name: string;
    players: Array<Player>;
}
export enum TossDecision {
    bat = "bat",
    bowl = "bowl"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createMatch(teams: Array<Team>, oversPerInnings: bigint | null, toss: TossInfo | null): Promise<bigint>;
    deleteMatch(matchId: bigint): Promise<void>;
    getCallerSavedTeam(): Promise<SavedTeam | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMatch(matchId: bigint): Promise<Match | null>;
    getPlayerStats(playerName: string): Promise<PersistentPlayerStats | null>;
    getSavedTeamOf(user: Principal): Promise<SavedTeam | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listAllPlayerStats(): Promise<Array<PersistentPlayerStats>>;
    listMatches(): Promise<Array<Match>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveTeam(team: Team): Promise<void>;
    startSecondInnings(matchId: bigint, newInnings: Innings): Promise<void>;
    updatePlayerStats(playerName: string, batting: BattingStats, bowling: BowlingStats): Promise<void>;
    updateTossInfo(matchId: bigint, toss: TossInfo): Promise<void>;
}
