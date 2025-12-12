# TODOs for itinerarius server

## first priority - smaller tasks

- Implement superroute hierarchy so relations with only relation members are retained.
- Add knotennetzwerk support if required.
- Ensure route relations expose both `ref` and `name` consistently in API/tiles.

## keep for later, do not work on this for now

- check details of <https://wiki.openstreetmap.org/wiki/Ideas_for_a_new_Hiking_Map>, although it is not that recent so most items have already been implemented

Routes:

- superroutes, so via alpina and TMB users should wait a bit
- knotennetzwerk ()
- in case of a relation:route the code of the path should be rendered in text, this code is normally in ref=*. When name=* is present it should be displayed as well.
