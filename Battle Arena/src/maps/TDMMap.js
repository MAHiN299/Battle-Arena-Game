import Phaser from 'phaser';

// ============================================================
// TDM ARENA — collision layout
//
// Source image: 2172 x 724
// Game canvas:  1480 x 720
// Scale: x * 0.6814, y * 0.9945
//
// All coordinates below are already converted to game space.
// ============================================================

export const TDM_LAYOUT = {

    // Tier heights — the TOP surface of each walkway
    TIER_GROUND: 845,
    TIER_LOW:    690,
    TIER_MID:    520,
    TIER_HIGH:   378,

    // Base staircases, which sit diagonally in the art.
    // Approximated as stepped platforms.
    STAIR_RED_X:  185,
    STAIR_BLUE_X: 1740,

    STATUE_LEFT:  880,
    STATUE_RIGHT: 1060,

    SPAWN_RED:  { x: 140, y: 790 },
    SPAWN_BLUE: { x: 1780, y: 790 }
};

export default class TDMMap
{
    constructor(scene)
    {
        this.scene = scene;
        this.L = TDM_LAYOUT;
    }

    build()
    {
        const scene = this.scene;
        const w = scene.cameras.main.width;
        const h = scene.cameras.main.height;

        // ---- Background, stretched to fit ----
        scene.add.image(w / 2, h / 2, 'tdmMap')
            .setDisplaySize(w, h)
            .setDepth(-10);

        // ---- Collision groups ----
        scene.ground    = scene.physics.add.staticGroup();
        scene.platforms = scene.physics.add.staticGroup();
        scene.ladders   = scene.physics.add.staticGroup();

        this.buildGround(w);
        this.buildPlatforms();
        this.buildLadders();
        this.buildWalls(w, h);

        return {
            spawnRed:  this.L.SPAWN_RED,
            spawnBlue: this.L.SPAWN_BLUE
        };
    }

    // ============================================================
    // GROUND — one continuous floor
    // ============================================================
    buildGround(w)
    {
        this.solid(w / 2, this.L.TIER_GROUND + 26, w, 52);
    }

    // ============================================================
    // PLATFORMS — jump-through, split around the statue
    // ============================================================
        buildPlatforms()
    {
        const L = this.L;
        const w = this.scene.cameras.main.width;

        // ---- LOW TIER ----
        this.platform(240, L.TIER_LOW, 420);
        this.platform(700, L.TIER_LOW, 420);
        this.platform(1220, L.TIER_LOW, 420);
        this.platform(1680, L.TIER_LOW, 420);

        // ---- MID TIER (statue sits between 880 and 1060) ----
        this.platform(240, L.TIER_MID, 420);
        this.platform(660, L.TIER_MID, 380);
        this.platform(1280, L.TIER_MID, 380);
        this.platform(1700, L.TIER_MID, 420);

        // ---- HIGH TIER — continuous across the map ----
        this.platform(w / 2, L.TIER_HIGH, w);

        // ---- Base staircases, as stepped blocks ----
        this.buildStairs(L.STAIR_RED_X, true);
        this.buildStairs(L.STAIR_BLUE_X, false);
    }

    // Diagonal stairs approximated as three descending steps
    buildStairs(baseX, goingRight)
    {
        const L = this.L;
        const dir = goingRight ? 1 : -1;

        // Ground up to low tier
        this.platform(baseX,            L.TIER_LOW + 50,  110);
        this.platform(baseX + dir * 60, L.TIER_LOW + 20,  110);

        // Low up to mid
        this.platform(baseX,            L.TIER_MID + 55,  110);
        this.platform(baseX + dir * 60, L.TIER_MID + 25,  110);

        // Mid up to high
        this.platform(baseX,            L.TIER_HIGH + 50, 110);
        this.platform(baseX + dir * 60, L.TIER_HIGH + 22, 110);
    }

    buildLadders()
    {
        const L = this.L;

        // Ladder x positions read off the art
        const ladderXs = [
            430,   // red inner
            600,   // red centre approach
            790,   // left of statue
            1150,  // right of statue
            1340,  // blue centre approach
            1510   // blue inner
        ];

        ladderXs.forEach(x => {
            this.ladder(x, L.TIER_LOW, L.TIER_GROUND);
            this.ladder(x, L.TIER_MID, L.TIER_LOW);
            this.ladder(x, L.TIER_HIGH, L.TIER_MID);
        });
    }

    // ============================================================
    // LADDERS
    // ============================================================
    buildLadders()
    {
        const L = this.L;

        // Red side
        this.ladder(320, L.TIER_LOW, L.TIER_GROUND);
        this.ladder(320, L.TIER_MID, L.TIER_LOW);
        this.ladder(320, L.TIER_HIGH, L.TIER_MID);

        // Blue side, mirrored
        this.ladder(1160, L.TIER_LOW, L.TIER_GROUND);
        this.ladder(1160, L.TIER_MID, L.TIER_LOW);
        this.ladder(1160, L.TIER_HIGH, L.TIER_MID);

        // Centre routes, so the middle is contestable from below
        this.ladder(600, L.TIER_MID, L.TIER_LOW);
        this.ladder(880, L.TIER_MID, L.TIER_LOW);

        this.ladder(620, L.TIER_HIGH, L.TIER_MID);
        this.ladder(860, L.TIER_HIGH, L.TIER_MID);
    }

    // ============================================================
    // WALLS — keep players inside
    // ============================================================
    buildWalls(w, h)
    {
        this.solid(-10, h / 2, 20, h);
        this.solid(w + 10, h / 2, 20, h);
    }

    // ============================================================
    // BUILDERS
    // ============================================================
    solid(cx, cy, width, height)
    {
        const body = this.scene.ground.create(cx, cy, '__WHITE');
        body.setDisplaySize(width, height);
        body.setVisible(false);
        body.body.setSize(width, height);
        body.refreshBody();
        return body;
    }

    platform(cx, topY, width)
    {
        const height = 18;

        const body = this.scene.platforms.create(cx, topY + height / 2, '__WHITE');
        body.setDisplaySize(width, height);
        body.setVisible(false);
        body.body.setSize(width, height);
        body.refreshBody();

        // Jump-through: solid only from above
        body.body.checkCollision.down  = false;
        body.body.checkCollision.left  = false;
        body.body.checkCollision.right = false;

        return body;
    }

    ladder(cx, topY, bottomY)
    {
        const height = bottomY - topY;
        const width = 44;

        const l = this.scene.ladders.create(cx, topY + height / 2, '__WHITE');
        l.setDisplaySize(width, height);
        l.setVisible(false);
        l.body.setSize(width, height);
        l.refreshBody();

        return l;
    }
}