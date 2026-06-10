# Valorant Map Picker

A simple Best-of-3 map veto tool for the current Valorant competitive map pool.

**Live:** https://RealDishwash.github.io/valorant-map-picker/

## Veto process

Follows the official Bo3 map veto order:

1. Team A bans a map
2. Team B bans a map
3. Team A bans a map
4. Team B bans a map
5. Team A picks the first map
6. Team B selects the starting side for the first map
7. Team B picks the second map
8. Team A selects the starting side for the second map
9. The remaining map becomes the decider
10. Team A selects the starting side for the decider map

The team that does not pick a map chooses the starting side for that map.

## Map pool

The competitive pool lives in the `MAP_POOL` array at the top of `script.js` — edit it there when the pool rotates.

---

Unofficial fan tool. Not affiliated with Riot Games.
