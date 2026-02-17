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
export interface BallExtras {
    noBall: boolean;
    byes: bigint;
    wide: boolean;
    legByes: bigint;
    legalDelivery: boolean;
}
export interface Ball {
    ballNumber: bigint;
    runs: bigint;
    bowler: Player;
    isWicket: boolean;
    extras?: BallExtras;
    batsman: Player;
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
export interface Match {
    id: bigint;
    teams: Array<Team>;
    owner: Principal;
    oversPerInnings?: bigint;
    innings: Array<Innings>;
}
export interface UserProfile {
    name: string;
}
export interface Team {
    id: bigint;
    name: string;
    players: Array<Player>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createMatch(teams: Array<Team>, oversPerInnings: bigint | null): Promise<bigint>;
    deleteMatch(matchId: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMatch(matchId: bigint): Promise<Match | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listMatches(): Promise<Array<Match>>;
    recordBall(matchId: bigint, inningsIndex: bigint, ball: Ball): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startInnings(matchId: bigint, battingTeam: Team, bowlingTeam: Team, overs: bigint | null): Promise<void>;
}
