import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
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
    extras : ?BallExtras; // New extras field
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
    overs : ?Nat; // Optional overs field
    ballsInCurrentOver : Nat;
  };

  public type Match = {
    id : Nat;
    owner : Principal;
    teams : [Team];
    innings : [Innings];
    oversPerInnings : ?Nat; // Updated to allow custom overs
  };

  var nextMatchId = 1;
  let matches = Map.empty<Nat, Match>();

  // Create a new match - requires user authentication
  public shared ({ caller }) func createMatch(teams : [Team], oversPerInnings : ?Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create matches");
    };

    let matchId = nextMatchId;
    nextMatchId += 1;

    let newMatch : Match = {
      id = matchId;
      owner = caller;
      teams;
      innings = [];
      oversPerInnings;
    };

    matches.add(matchId, newMatch);
    matchId;
  };

  // Start innings - requires user authentication and match ownership
  public shared ({ caller }) func startInnings(matchId : Nat, battingTeam : Team, bowlingTeam : Team, overs : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start innings");
    };

    switch (matches.get(matchId)) {
      case (null) {
        Runtime.trap("Match not found");
      };
      case (?match) {
        // Verify ownership
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the match owner can start innings");
        };

        let newInnings : Innings = {
          battingTeam;
          bowlingTeam;
          balls = [];
          totalRuns = 0;
          totalWickets = 0;
          overs;
          ballsInCurrentOver = 0;
        };

        let updatedInnings = match.innings.concat([newInnings]);
        let updatedMatch = {
          match with
          innings = updatedInnings;
        };

        matches.add(matchId, updatedMatch);
      };
    };
  };

  // Record a ball - requires user authentication and match ownership
  public shared ({ caller }) func recordBall(matchId : Nat, inningsIndex : Nat, ball : Ball) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record balls");
    };

    switch (matches.get(matchId)) {
      case (null) {
        Runtime.trap("Match not found");
      };
      case (?match) {
        // Verify ownership
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the match owner can record balls");
        };

        if (inningsIndex >= match.innings.size()) {
          Runtime.trap("Invalid innings index");
        };

        var updatedInningsArray = match.innings.toVarArray<Innings>();
        var currentInnings = updatedInningsArray[inningsIndex];

        // Determine if the delivery is legal
        let isLegalDelivery = switch (ball.extras) {
          case (null) { true };
          case (?extras) { extras.legalDelivery };
        };

        // Update ballsInCurrentOver based on legality
        var ballsInCurrentOver = currentInnings.ballsInCurrentOver;
        if (isLegalDelivery) {
          ballsInCurrentOver := (ballsInCurrentOver + 1) % 6;
        };

        let updatedBalls = currentInnings.balls.concat([ball]);
        let updatedInnings = {
          currentInnings with
          balls = updatedBalls;
          totalRuns = currentInnings.totalRuns + ball.runs;
          totalWickets = if (ball.isWicket) { currentInnings.totalWickets + 1 } else {
            currentInnings.totalWickets;
          };
          ballsInCurrentOver;
        };

        updatedInningsArray[inningsIndex] := updatedInnings;
        let finalInnings = updatedInningsArray.toArray();

        let updatedMatch = {
          match with
          innings = finalInnings;
        };

        matches.add(matchId, updatedMatch);
      };
    };
  };

  // Get a specific match - requires user authentication and ownership verification
  public query ({ caller }) func getMatch(matchId : Nat) : async ?Match {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view matches");
    };

    switch (matches.get(matchId)) {
      case (null) { null };
      case (?match) {
        // Verify ownership or admin
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own matches");
        };
        ?match;
      };
    };
  };

  // List all matches for the caller - requires user authentication
  public query ({ caller }) func listMatches() : async [Match] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list matches");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let matchList = if (isAdmin) {
      List.fromArray<Match>(matches.values().toArray())
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

  // Delete a match - requires user authentication and ownership
  public shared ({ caller }) func deleteMatch(matchId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete matches");
    };

    switch (matches.get(matchId)) {
      case (null) {
        Runtime.trap("Match not found");
      };
      case (?match) {
        // Verify ownership or admin
        if (match.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the match owner can delete matches");
        };
        matches.remove(matchId);
      };
    };
  };
};
