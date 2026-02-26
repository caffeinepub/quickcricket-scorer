import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";

import AccessControl "authorization/access-control";

import MixinAuthorization "authorization/MixinAuthorization";



actor {
  // Initialize access control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();
  let matches = Map.empty<Nat, Match>();
  let savedTeams = Map.empty<Principal, SavedTeam>();
  let playerStats = Map.empty<Text, PersistentPlayerStats>();

  var nextMatchId = 1;

  // =========================
  //        Core Types
  // =========================
  public type UserProfile = {
    name : Text;
  };

  public type Player = {
    id : Nat;
    name : Text;
    battingOrderPosition : ?Nat;
  };

  public type Team = {
    id : Nat;
    name : Text;
    players : [Player];
  };

  // Extended Ball type to track previous striker/non-striker for undo functionality
  public type Ball = {
    ballNumber : Nat;
    batsman : Player;
    bowler : Player;
    runs : Nat;
    isWicket : Bool;
    extras : ?BallExtras;
    previousStrikerState : ?PlayerStatsSnapshot;
    previousNonStrikerState : ?PlayerStatsSnapshot;
  };

  public type BallExtras = {
    wide : Bool;
    noBall : Bool;
    byes : Nat;
    legByes : Nat;
    legalDelivery : Bool;
  };

  public type PlayerStatsSnapshot = {
    player : Player;
    runs : Nat;
    ballsFaced : Nat;
    fours : Nat;
    sixes : Nat;
    isStriker : Bool;
  };

  public type Innings = {
    battingTeam : Team;
    bowlingTeam : Team;
    balls : [Ball];
    totalRuns : Nat;
    totalWickets : Nat;
    overs : ?Nat;
    ballsInCurrentOver : Nat;
    currentStriker : ?Player;
    currentNonStriker : ?Player;
    currentBowler : ?Player;
  };

  public type TossDecision = {
    #bat;
    #bowl;
  };

  public type TossInfo = {
    winnerTeamId : Nat;
    decision : TossDecision;
  };

  public type Match = {
    id : Nat;
    owner : Principal;
    teams : [Team];
    innings : [Innings];
    oversPerInnings : ?Nat;
    toss : ?TossInfo;
  };

  public type BattingStats = {
    runs : Nat;
    ballsFaced : Nat;
    fours : Nat;
    sixes : Nat;
    outs : Nat;
  };

  public type BowlingStats = {
    ballsBowled : Nat;
    runsConceded : Nat;
    wickets : Nat;
    maidens : Nat;
  };

  public type PersistentPlayerStats = {
    playerName : Text;
    battingStats : BattingStats;
    bowlingStats : BowlingStats;
    matchesPlayed : Nat;
    lastUpdated : Time.Time;
  };

  public type SavedTeam = {
    owner : Principal;
    team : Team;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // =========================
  //   User Profile Functions
  // =========================

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // =========================
  //   Player Stats Functions
  // =========================

  public shared ({ caller }) func updatePlayerStats(playerName : Text, batting : BattingStats, bowling : BowlingStats) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update player stats");
    };

    let now = Time.now();
    let existingStats = switch (playerStats.get(playerName)) {
      case (null) {
        {
          playerName;
          battingStats = batting;
          bowlingStats = bowling;
          matchesPlayed = 1;
          lastUpdated = now;
        };
      };
      case (?stats) {
        let newMatches = stats.matchesPlayed + 1;
        {
          stats with
          battingStats = mergeBattingStats(stats.battingStats, batting);
          bowlingStats = mergeBowlingStats(stats.bowlingStats, bowling);
          matchesPlayed = newMatches;
          lastUpdated = now;
        };
      };
    };

    playerStats.add(playerName, existingStats);
  };

  func mergeBattingStats(existing : BattingStats, newStats : BattingStats) : BattingStats {
    {
      existing with
      runs = existing.runs + newStats.runs;
      ballsFaced = existing.ballsFaced + newStats.ballsFaced;
      fours = existing.fours + newStats.fours;
      sixes = existing.sixes + newStats.sixes;
      outs = existing.outs + newStats.outs;
    };
  };

  func mergeBowlingStats(existing : BowlingStats, newStats : BowlingStats) : BowlingStats {
    {
      existing with
      ballsBowled = existing.ballsBowled + newStats.ballsBowled;
      runsConceded = existing.runsConceded + newStats.runsConceded;
      wickets = existing.wickets + newStats.wickets;
      maidens = existing.maidens + newStats.maidens;
    };
  };

  public query ({ caller }) func getPlayerStats(playerName : Text) : async ?PersistentPlayerStats {
    // Player stats are public information - no authorization required
    playerStats.get(playerName);
  };

  public query ({ caller }) func listAllPlayerStats() : async [PersistentPlayerStats] {
    // Player stats are public information - no authorization required
    playerStats.values().toArray();
  };

  // =========================
  //     Saved Teams
  // =========================

  public shared ({ caller }) func saveTeam(team : Team) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can save teams");
    };

    let now = Time.now();
    let saved : SavedTeam = {
      owner = caller;
      team;
      createdAt = now;
      updatedAt = now;
    };

    savedTeams.add(caller, saved);
  };

  public query ({ caller }) func getCallerSavedTeam() : async ?SavedTeam {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view saved teams");
    };
    savedTeams.get(caller);
  };

  public query ({ caller }) func getSavedTeamOf(user : Principal) : async ?SavedTeam {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own saved team");
    };
    savedTeams.get(user);
  };

  // =========================
  //       Match Logic
  // =========================

  public shared ({ caller }) func createMatch(teams : [Team], oversPerInnings : ?Nat, toss : ?TossInfo) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create matches");
    };

    if (teams.isEmpty()) {
      Runtime.trap("At least two teams must be provided.");
    };

    switch (oversPerInnings) {
      case (?overs) {
        if (overs < 1 or overs > 50) {
          Runtime.trap("Overs per innings must be between 1 and 50");
        };
      };
      case (null) {};
    };

    switch (toss) {
      case (null) {
        Runtime.trap("Toss information must be provided. Please include toss winner and decision.");
      };
      case (?tossInfo) {
        let teamIds = teams.map(func(team) { team.id });
        if (not teamIds.any(func(id) { id == tossInfo.winnerTeamId })) {
          Runtime.trap("Winner team ID does not match any provided team");
        };
      };
    };

    let matchId = nextMatchId;
    nextMatchId += 1;

    let newMatch : Match = {
      id = matchId;
      owner = caller;
      teams;
      innings = [];
      oversPerInnings;
      toss;
    };

    matches.add(matchId, newMatch);
    matchId;
  };

  public shared ({ caller }) func updateTossInfo(matchId : Nat, toss : TossInfo) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update matches");
    };

    switch (matches.get(matchId)) {
      case (null) {
        Runtime.trap("Match not found");
      };
      case (?match) {
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the match owner can update toss info");
        };

        if (match.innings.size() > 0) {
          Runtime.trap("Cannot update toss information after innings have started");
        };

        let teamIds = match.teams.map(func(team) { team.id });
        if (not teamIds.any(func(id) { id == toss.winnerTeamId })) {
          Runtime.trap("Winner team ID does not match any provided team");
        };

        let updatedMatch = { match with toss = ?toss };
        matches.add(matchId, updatedMatch);
      };
    };
  };

  public shared ({ caller }) func startSecondInnings(matchId : Nat, newInnings : Innings) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add innings");
    };

    switch (matches.get(matchId)) {
      case (null) {
        Runtime.trap("Match not found");
      };
      case (?match) {
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the match owner can add innings");
        };

        if (match.innings.size() != 1) {
          Runtime.trap("Second innings can only be started for matches with one existing innings");
        };

        let existingInnings = List.fromArray<Innings>(match.innings);
        existingInnings.add(newInnings);
        let updatedMatch = { match with innings = existingInnings.toArray() };
        matches.add(matchId, updatedMatch);
      };
    };
  };

  public query ({ caller }) func getMatch(matchId : Nat) : async ?Match {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view matches");
    };

    switch (matches.get(matchId)) {
      case (null) { null };
      case (?match) {
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own matches");
        };
        ?match;
      };
    };
  };

  public query ({ caller }) func listMatches() : async [Match] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list matches");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let matchList = if (isAdmin) {
      List.fromArray<Match>(matches.values().toArray());
    } else {
      let filteredMatches = matches.toArray().filter(
        func((_, m)) { m.owner == caller }
      );
      if (filteredMatches.size() > 0) {
        let matchesArray = filteredMatches.map(func((_, m)) { m });
        List.fromArray<Match>(matchesArray);
      } else {
        List.empty<Match>();
      };
    };

    matchList.toArray();
  };

  public shared ({ caller }) func deleteMatch(matchId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete matches");
    };

    switch (matches.get(matchId)) {
      case (null) {
        Runtime.trap("Match not found");
      };
      case (?match) {
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the match owner can delete matches");
        };
        matches.remove(matchId);
      };
    };
  };
};
