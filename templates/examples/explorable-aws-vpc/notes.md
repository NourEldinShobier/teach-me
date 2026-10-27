# explorable-aws-vpc
Format: explorable (diagram trace + predict + sim + 4 quizzes + 7 cards).
Sources: AWS VPC docs (NAT gateways, Internet gateways, route priority, security groups), ELB docs (how it works, ALB security groups).
Model: `model(change)` in the lesson script does longest-prefix lookups over two route tables; the sim draws only from it.
Addresses use RFC 5737 documentation ranges plus 10.0.0.0/16.
Known limits: SVG text shrinks at phone width (fixed viewBox); packet animation in the sim is SMIL, not driven by tm.seek.
