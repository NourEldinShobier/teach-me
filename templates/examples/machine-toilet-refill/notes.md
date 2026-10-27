# machine-toilet-refill

Teaches: float = sensor, fill valve = actuator, flapper = gate, overflow tube = safety limit. One pure model(i, p) drives water level, float, valve %, inflow and clock.

Sourced: 1.28 gpf (~4.8 L) EPA WaterSense residential toilets (4.8 L is my conversion); sequence float drops / valve opens / flapper closes / float rises / valve shuts / overflow refills bowl: US 8,387,652 B2 background; refill 30-60 s and 1 gpm = 60 s per gallon: Globe Union support page (seen only via search snippet, page returned 403 to fetch); lower the float if water sits above the overflow tube, dye test: EPA WaterSense Fix a Leak material.

Illustrative (stated in the lesson): 8.0 L full, 3.2 L left at flapper close, 4 s flush, 1.9 gpm supply (refill 47 s), 0.4 L throttle band with a 3.3 s time constant.
