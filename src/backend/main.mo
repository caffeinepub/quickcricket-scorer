import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Management Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
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

  // Cricket Match Types
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

  public type Ball = {
    ballNumber : Nat;
    batsman : Player;
    bowler : Player;
    runs : Nat;
    isWicket : Bool;
    extras : ?BallExtras;
  };

  public type BallExtras = {
    wide : Bool;
    noBall : Bool;
    byes : Nat;
    legByes : Nat;
    legalDelivery : Bool;
  };

  public type Innings = {
    battingTeam : Team;
    bowlingTeam : Team;
    balls : [Ball];
    totalRuns : Nat;
    totalWickets : Nat;
    overs : ?Nat;
    ballsInCurrentOver : Nat;
  };

  public type TossDecision = {
    #bat;
    #bowl;
  };

  public type TossInfo = {
    winnerTeamId : Nat; // Team ID that won the toss
    decision : TossDecision;
  };

  public type Match = {
    id : Nat;
    owner : Principal;
    teams : [Team];
    innings : [Innings];
    oversPerInnings : ?Nat;
    toss : ?TossInfo; // Added toss info
  };

  var nextMatchId = 1;
  let matches = Map.empty<Nat, Match>();

  // Create a new match - requires user authentication
  public shared ({ caller }) func createMatch(teams : [Team], oversPerInnings : ?Nat, toss : ?TossInfo) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create matches");
    };

    // Validate teams array
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

    // Validate toss information
    switch (toss) {
      case (null) {
        Runtime.trap("Toss information must be provided. Please include toss winner and decision.");
      };
      case (?tossInfo) {
        // Validate winnerTeamId against teams array
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
      toss; // Store the provided toss information
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
        // Check if match owner - admins cannot override match owner's toss data
        if (match.owner != caller) {
          Runtime.trap("Unauthorized: Only the match owner can update toss info");
        };

        // Prevent toss updates after innings have started
        if (match.innings.size() > 0) {
          Runtime.trap("Cannot update toss information after innings have started");
        };

        // Validate winnerTeamId against match teams
        let teamIds = match.teams.map(func(team) { team.id });
        if (not teamIds.any(func(id) { id == toss.winnerTeamId })) {
          Runtime.trap("Winner team ID does not match any provided team");
        };

        let updatedMatch = { match with toss = ?toss };
        matches.add(matchId, updatedMatch);
      };
    };
  };

  // Existing functions unchanged...

  public query ({ caller }) func getMatch(matchId : Nat) : async ?Match {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view matches");
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

  // Removed unused getTossInfo function as toss information is now part of Match
};
