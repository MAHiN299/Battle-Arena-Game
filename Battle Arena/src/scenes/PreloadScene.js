import Phaser from 'phaser';

import titlepage1Asset from '../Assets/TitlePages/titilepage_1.png';
import titlepage2Asset from '../Assets/TitlePages/titlepage_2.png';
import menuVideoAsset from '../Assets/animationMenu.mp4'; 
import themeMusicMenuAsset from '../Assets/soundtrack/ThemeMusicMenu.mp3';
import gameMusic from '../Assets/soundtrack/gameMusic.mp3';
import arena2MusicAsset from '../Assets/soundtrack/arena2bg.mp3';
import selectionSoundAsset from '../Assets/soundtrack/selection.mp3';
import arenaAsset from '../Assets/Arena_1.png';
import arena2Asset from '../Assets/Arena_2.png';
import charSelectBgAsset from '../Assets/charSelectBg.png';


import grenadeAsset from '../Assets/weapon/Grenade/Grenade.png';
import fireEffect1Asset from '../Assets/weapon/fireEffect/fg1.png';
import fireEffect2Asset from '../Assets/weapon/fireEffect/fg2.png';
import fireEffect3Asset from '../Assets/weapon/fireEffect/fg3.png';
import fireEffect4Asset from '../Assets/weapon/fireEffect/fg4.png';
import fireEffect5Asset from '../Assets/weapon/fireEffect/fg5.png';
import fireEffect6Asset from '../Assets/weapon/fireEffect/fg6.png';
import landmineAsset from '../Assets/weapon/Mine/landmine.png';
import molotovAsset from '../Assets/weapon/Mine/moltov.png';



import heroPP_1 from '../Assets/player/ninja/menuScene/PP_purple.png';
import heroPP_2 from '../Assets/player/ninja2/menuScene/PP_pink.png';

import heroBg_1 from '../Assets/player/ninja/menuScene/bg_purple.png';
import heroBg_2 from '../Assets/player/ninja2/menuScene/bg_pink.png';

import heroIdle1Asset from '../Assets/player/ninja/idle_1.png';
import heroIdle2Asset from '../Assets/player/ninja/idle_2.png';
import heroIdle3Asset from '../Assets/player/ninja/idle_3.png';
import heroIdle4Asset from '../Assets/player/ninja/idle_4.png';
import heroIdle5Asset from '../Assets/player/ninja/idle_5.png';
import heroIdle6Asset from '../Assets/player/ninja/idle_6.png';
import heroIdle7Asset from '../Assets/player/ninja/idle_7.png';

import heroRun1Asset from '../Assets/player/ninja/run_1ud.png';
import heroRun2Asset from '../Assets/player/ninja/run_2ud.png';
import heroRun3Asset from '../Assets/player/ninja/run_3ud.png';
import heroRun4Asset from '../Assets/player/ninja/run_4ud.png';
import heroRun5Asset from '../Assets/player/ninja/run_5ud.png';

import heroJump1Asset from '../Assets/player/ninja/jump_1ud.png';
import heroJump2Asset from '../Assets/player/ninja/jump_2ud.png';
import heroJump3Asset from '../Assets/player/ninja/jump_3ud.png';
import heroJump4Asset from '../Assets/player/ninja/jump_4ud.png';
import heroJump5Asset from '../Assets/player/ninja/jump_5ud.png';
import heroJump6Asset from '../Assets/player/ninja/jump_6ud.png';
import heroJump7Asset from '../Assets/player/ninja/jump_7ud.png';
import heroJump8Asset from '../Assets/player/ninja/jump_8ud.png';
import heroJump9Asset from '../Assets/player/ninja/jump_9ud.png';

import heroClimb1Asset from '../Assets/player/ninja/Climb_000.png';
import heroClimb2Asset from '../Assets/player/ninja/Climb_001.png';
import heroClimb3Asset from '../Assets/player/ninja/Climb_002.png';
import heroClimb4Asset from '../Assets/player/ninja/Climb_003.png';
import heroClimb5Asset from '../Assets/player/ninja/Climb_004.png';
import heroClimb6Asset from '../Assets/player/ninja/Climb_005.png';
import heroClimb7Asset from '../Assets/player/ninja/Climb_006.png';
import heroClimb8Asset from '../Assets/player/ninja/Climb_007.png';



import heroAttack1Asset from '../Assets/player/ninja/attack_1.png';
import heroAttack2Asset from '../Assets/player/ninja/attack_2.png';
import heroAttack3Asset from '../Assets/player/ninja/attack_3.png';
import heroAttack4Asset from '../Assets/player/ninja/attack_4.png';
import heroAttack5Asset from '../Assets/player/ninja/attack_5.png';
import heroAttack6Asset from '../Assets/player/ninja/attack_6.png';
import heroAttack7Asset from '../Assets/player/ninja/attack_7.png';
import heroAttack8Asset from '../Assets/player/ninja/attack_8.png';



import heroThrow1Asset from '../Assets/player/ninja/Throw__005.png';
import heroThrow2Asset from '../Assets/player/ninja/Throw__006.png';
import heroThrow3Asset from '../Assets/player/ninja/Throw__007.png';
import heroThrow4Asset from '../Assets/player/ninja/Throw__008.png';
import heroThrow5Asset from '../Assets/player/ninja/Throw__009.png';


import heroDead1Asset from '../Assets/player/ninja/Dead__000.png';
import heroDead2Asset from '../Assets/player/ninja/Dead__001.png';
import heroDead3Asset from '../Assets/player/ninja/Dead__002.png';
import heroDead4Asset from '../Assets/player/ninja/Dead__003.png';
import heroDead5Asset from '../Assets/player/ninja/Dead__004.png';
import heroDead6Asset from '../Assets/player/ninja/Dead__006.png';
import heroDead7Asset from '../Assets/player/ninja/Dead__009.png';

import heroSMGSideAsset from '../Assets/player/ninja/Shooting/sideShoot.png';
import heroSMGUpAsset from '../Assets/player/ninja/Shooting/upShoot.png';
import heroSMGDownAsset from '../Assets/player/ninja/Shooting/downShoot.png';


import hero2Idle1Asset from '../Assets/player/ninja2/Action/Idle_000.png';
import hero2Idle2Asset from '../Assets/player/ninja2/Action/Idle_001.png';
import hero2Idle3Asset from '../Assets/player/ninja2/Action/Idle_002.png';
import hero2Idle4Asset from '../Assets/player/ninja2/Action/Idle_003.png';
import hero2Idle5Asset from '../Assets/player/ninja2/Action/Idle_004.png';

import hero2Run1Asset from '../Assets/player/ninja2/Action/Run_000.png';
import hero2Run2Asset from '../Assets/player/ninja2/Action/Run_001.png';
import hero2Run3Asset from '../Assets/player/ninja2/Action/Run_002.png';
import hero2Run4Asset from '../Assets/player/ninja2/Action/Run_003.png';
import hero2Run5Asset from '../Assets/player/ninja2/Action/Run_004.png';
import hero2Run6Asset from '../Assets/player/ninja2/Action/Run_005.png';
import hero2Run7Asset from '../Assets/player/ninja2/Action/Run_006.png';
import hero2Run8Asset from '../Assets/player/ninja2/Action/Run_007.png';
import hero2Run9Asset from '../Assets/player/ninja2/Action/Run_008.png';
import hero2Run10Asset from '../Assets/player/ninja2/Action/Run_009.png';

import hero2Jump1Asset from '../Assets/player/ninja2/Action/Jump_000.png';
import hero2Jump2Asset from '../Assets/player/ninja2/Action/Jump_001.png';
import hero2Jump3Asset from '../Assets/player/ninja2/Action/Jump_002.png';
import hero2Jump4Asset from '../Assets/player/ninja2/Action/Jump_003.png';
import hero2Jump5Asset from '../Assets/player/ninja2/Action/Jump_004.png';
import hero2Jump6Asset from '../Assets/player/ninja2/Action/Jump_005.png';
import hero2Jump7Asset from '../Assets/player/ninja2/Action/Jump_006.png';
import hero2Jump8Asset from '../Assets/player/ninja2/Action/Jump_007.png';
import hero2Jump9Asset from '../Assets/player/ninja2/Action/Jump_008.png';
import hero2Jump10Asset from '../Assets/player/ninja2/Action/Jump_009.png';

import hero2Climb1Asset from '../Assets/player/ninja2/Action/Climb_000.png';
import hero2Climb2Asset from '../Assets/player/ninja2/Action/Climb_001.png';
import hero2Climb3Asset from '../Assets/player/ninja2/Action/Climb_002.png';
import hero2Climb4Asset from '../Assets/player/ninja2/Action/Climb_003.png';
import hero2Climb5Asset from '../Assets/player/ninja2/Action/Climb_004.png';
import hero2Climb6Asset from '../Assets/player/ninja2/Action/Climb_005.png';
import hero2Climb7Asset from '../Assets/player/ninja2/Action/Climb_006.png';
import hero2Climb8Asset from '../Assets/player/ninja2/Action/Climb_007.png';


import hero2Attack1Asset from '../Assets/player/ninja2/Action/Attack_000.png';
import hero2Attack2Asset from '../Assets/player/ninja2/Action/Attack_001.png';
import hero2Attack3Asset from '../Assets/player/ninja2/Action/Attack_002.png';
import hero2Attack4Asset from '../Assets/player/ninja2/Action/Attack_003.png';
import hero2Attack5Asset from '../Assets/player/ninja2/Action/Attack_004.png';
import hero2Attack6Asset from '../Assets/player/ninja2/Action/Attack_005.png';
import hero2Attack7Asset from '../Assets/player/ninja2/Action/Attack_006.png';
import hero2Attack8Asset from '../Assets/player/ninja2/Action/Attack_007.png';
import hero2Attack9Asset from '../Assets/player/ninja2/Action/Attack_008.png';
import hero2Attack10Asset from '../Assets/player/ninja2/Action/Attack_009.png';

import hero2Throw1Asset from '../Assets/player/ninja2/Action/Throw_005.png';
import hero2Throw2Asset from '../Assets/player/ninja2/Action/Throw_006.png';
import hero2Throw3Asset from '../Assets/player/ninja2/Action/Throw_007.png';
import hero2Throw4Asset from '../Assets/player/ninja2/Action/Throw_008.png';
import hero2Throw5Asset from '../Assets/player/ninja2/Action/Throw_009.png';

import hero2Dead1Asset from '../Assets/player/ninja2/Action/Dead_000.png';  
import hero2Dead2Asset from '../Assets/player/ninja2/Action/Dead_001.png';
import hero2Dead3Asset from '../Assets/player/ninja2/Action/Dead_002.png';
import hero2Dead4Asset from '../Assets/player/ninja2/Action/Dead_003.png';
import hero2Dead5Asset from '../Assets/player/ninja2/Action/Dead_005.png';
import hero2Dead6Asset from '../Assets/player/ninja2/Action/Dead_007.png';

import hero2SMGSideAsset from '../Assets/player/ninja2/Action/Shooting/sideShoot.png';
import hero2SMGUpAsset from '../Assets/player/ninja2/Action/Shooting/upShoot.png';
import hero2SMGDownAsset from '../Assets/player/ninja2/Action/Shooting/downShoot.png';

/////////////////////////////////////////enemy assets////////////////////////////////////////////////////

import enemy1Idle1Asset from '../Assets/Enemies/BaseEnemy1/idle/i1.png';
import enemy1Idle2Asset from '../Assets/Enemies/BaseEnemy1/idle/i2.png';
import enemy1Idle3Asset from '../Assets/Enemies/BaseEnemy1/idle/i3.png';
import enemy1Idle4Asset from '../Assets/Enemies/BaseEnemy1/idle/i4.png';
import enemy1Idle5Asset from '../Assets/Enemies/BaseEnemy1/idle/i5.png';
import enemy1Idle6Asset from '../Assets/Enemies/BaseEnemy1/idle/i6.png';


import enemy1Run1Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r1.png';
import enemy1Run2Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r2.png';
import enemy1Run3Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r3S.png';
import enemy1Run4Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r4.png';
import enemy1Run5Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r5.png';
import enemy1Run6Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r6.png';
import enemy1Run7Asset from '../Assets/Enemies/BaseEnemy1/running/Sample1/r7.png';

import enemy1Attack1Asset from '../Assets/Enemies/BaseEnemy1/attack/a1.png';
import enemy1Attack2Asset from '../Assets/Enemies/BaseEnemy1/attack/a2.png';
import enemy1Attack3Asset from '../Assets/Enemies/BaseEnemy1/attack/a3.png';
import enemy1Attack4Asset from '../Assets/Enemies/BaseEnemy1/attack/a4.png';

import enemy1ladderClimb1Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c1.png';
import enemy1ladderClimb2Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c2.png';
import enemy1ladderClimb3Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c3.png';
import enemy1ladderClimb4Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c4.png';
import enemy1ladderClimb5Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c5.png';
import enemy1ladderClimb6Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c6.png';
import enemy1ladderClimb7Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c7.png';
import enemy1ladderClimb8Asset from '../Assets/Enemies/BaseEnemy1/ladderClimb/c8.png';

import enemy1hurt1Asset from '../Assets/Enemies/BaseEnemy1/hurt/h1.png';

import enemy1Jump1Asset from '../Assets/Enemies/BaseEnemy1/jumping/j1.png';
import enemy1Jump2Asset from '../Assets/Enemies/BaseEnemy1/jumping/j2.png';
import enemy1Jump3Asset from '../Assets/Enemies/BaseEnemy1/jumping/j3.png';
import enemy1Jump4Asset from '../Assets/Enemies/BaseEnemy1/jumping/j4.png';

import enemy1StandUp1Asset from '../Assets/Enemies/BaseEnemy1/standUp/s1.png';
import enemy1StandUp2Asset from '../Assets/Enemies/BaseEnemy1/standUp/s2.png';
import enemy1StandUp3Asset from '../Assets/Enemies/BaseEnemy1/standUp/s3.png';
import enemy1StandUp4Asset from '../Assets/Enemies/BaseEnemy1/standUp/s4.png';
import enemy1StandUp5Asset from '../Assets/Enemies/BaseEnemy1/standUp/s5.png';
import enemy1StandUp6Asset from '../Assets/Enemies/BaseEnemy1/standUp/s6.png';

import enemy1blastAway1Asset from '../Assets/Enemies/BaseEnemy1/blastAway/b1.png';


import enemy1Death1Asset from '../Assets/Enemies/BaseEnemy1/death/d1.png';
import enemy1Death2Asset from '../Assets/Enemies/BaseEnemy1/death/d2.png';
import enemy1Death3Asset from '../Assets/Enemies/BaseEnemy1/death/d3.png';
import enemy1Death4Asset from '../Assets/Enemies/BaseEnemy1/death/d4.png';
import enemy1Death5Asset from '../Assets/Enemies/BaseEnemy1/death/d5.png';
import enemy1Death6Asset from '../Assets/Enemies/BaseEnemy1/death/d6.png';
////////////////////////////////////Boar enemy assets////////////////////////////////////////////////////
import boarBreak01Asset from '../Assets/Enemies/Boar/break/01.png';
import boarBreak02Asset from '../Assets/Enemies/Boar/break/02.png';
import boarBreak03Asset from '../Assets/Enemies/Boar/break/03.png';
import boarBreak04Asset from '../Assets/Enemies/Boar/break/04.png';
import boarBreak06Asset from '../Assets/Enemies/Boar/break/06.png';
import boarBreak07Asset from '../Assets/Enemies/Boar/break/07.png';
import boarBreak08Asset from '../Assets/Enemies/Boar/break/08.png';
import boarBreak09Asset from '../Assets/Enemies/Boar/break/09.png';
import boarBreak10Asset from '../Assets/Enemies/Boar/break/10.png';
import boarBreak11Asset from '../Assets/Enemies/Boar/break/11.png';
import boarBreak12Asset from '../Assets/Enemies/Boar/break/12.png';

import boarDeath01Asset from '../Assets/Enemies/Boar/death/01.png';
import boarDeath02Asset from '../Assets/Enemies/Boar/death/02.png';
import boarDeath03Asset from '../Assets/Enemies/Boar/death/03.png';
import boarDeath04Asset from '../Assets/Enemies/Boar/death/04.png';
import boarDeath05Asset from '../Assets/Enemies/Boar/death/05.png';
import boarDeath07Asset from '../Assets/Enemies/Boar/death/07.png';
import boarDeath08Asset from '../Assets/Enemies/Boar/death/08.png';
import boarDeath09Asset from '../Assets/Enemies/Boar/death/09.png';
import boarDeath10Asset from '../Assets/Enemies/Boar/death/10.png';
import boarDeath11Asset from '../Assets/Enemies/Boar/death/11.png';
import boarDeath12Asset from '../Assets/Enemies/Boar/death/12.png';

import boarIdle01Asset from '../Assets/Enemies/Boar/idle/01.png';
import boarIdle02Asset from '../Assets/Enemies/Boar/idle/02.png';
import boarIdle03Asset from '../Assets/Enemies/Boar/idle/03.png';
import boarIdle04Asset from '../Assets/Enemies/Boar/idle/04.png';
import boarIdle05Asset from '../Assets/Enemies/Boar/idle/05.png';
import boarIdle06Asset from '../Assets/Enemies/Boar/idle/06.png';
import boarIdle07Asset from '../Assets/Enemies/Boar/idle/07.png';
import boarIdle08Asset from '../Assets/Enemies/Boar/idle/08.png';
import boarIdle09Asset from '../Assets/Enemies/Boar/idle/09.png';
import boarIdle10Asset from '../Assets/Enemies/Boar/idle/10.png';

import boarRunning01Asset from '../Assets/Enemies/Boar/running/01.png';
import boarRunning02Asset from '../Assets/Enemies/Boar/running/02.png';
import boarRunning03Asset from '../Assets/Enemies/Boar/running/03.png';
import boarRunning04Asset from '../Assets/Enemies/Boar/running/04.png';
import boarRunning05Asset from '../Assets/Enemies/Boar/running/05.png';
import boarRunning06Asset from '../Assets/Enemies/Boar/running/06.png';
import boarRunning07Asset from '../Assets/Enemies/Boar/running/07.png';
import boarRunning08Asset from '../Assets/Enemies/Boar/running/08.png';
import boarRunning09Asset from '../Assets/Enemies/Boar/running/09.png';

//////////////////////////////Bomber enemy assets////////////////////////////////////////////////////
import bomberEnemyIdle1Asset from '../Assets/Enemies/Bomber/idle/i1.png';
import bomberEnemyIdle2Asset from '../Assets/Enemies/Bomber/idle/i2.png';
import bomberEnemyIdle3Asset from '../Assets/Enemies/Bomber/idle/i3.png';
import bomberEnemyIdle4Asset from '../Assets/Enemies/Bomber/idle/i4.png';

import bomberEnemyJump1Asset from '../Assets/Enemies/Bomber/jump/j1.png';
import bomberEnemyJump2Asset from '../Assets/Enemies/Bomber/jump/j2.png';
import bomberEnemyJump3Asset from '../Assets/Enemies/Bomber/jump/j3.png';
import bomberEnemyJump4Asset from '../Assets/Enemies/Bomber/jump/j4.png';
import bomberEnemyJump5Asset from '../Assets/Enemies/Bomber/jump/j5.png';
import bomberEnemyJump6Asset from '../Assets/Enemies/Bomber/jump/j6.png';
import bomberEnemyJump7Asset from '../Assets/Enemies/Bomber/jump/j7.png';
import bomberEnemyJump8Asset from '../Assets/Enemies/Bomber/jump/j8.png';
import bomberEnemyJump9Asset from '../Assets/Enemies/Bomber/jump/j9.png';
import bomberEnemyJump10Asset from '../Assets/Enemies/Bomber/jump/j10.png';


import bomberEnemyRun1Asset from '../Assets/Enemies/Bomber/running/r1.png'; 
import bomberEnemyRun2Asset from '../Assets/Enemies/Bomber/running/r2.png';
import bomberEnemyRun3Asset from '../Assets/Enemies/Bomber/running/r3.png';
import bomberEnemyRun4Asset from '../Assets/Enemies/Bomber/running/r4.png';
import bomberEnemyRun5Asset from '../Assets/Enemies/Bomber/running/r5.png';
import bomberEnemyRun6Asset from '../Assets/Enemies/Bomber/running/r6.png';
import bomberEnemyRun7Asset from '../Assets/Enemies/Bomber/running/r7.png';


import bomberEnemyThrow1Asset from '../Assets/Enemies/Bomber/throw/t1.png';
import bomberEnemyThrow2Asset from '../Assets/Enemies/Bomber/throw/t2.png';
import bomberEnemyThrow3Asset from '../Assets/Enemies/Bomber/throw/t3.png';
import bomberEnemyThrow4Asset from '../Assets/Enemies/Bomber/throw/t4.png';
import bomberEnemyThrow5Asset from '../Assets/Enemies/Bomber/throw/t5.png';
import bomberEnemyThrow6Asset from '../Assets/Enemies/Bomber/throw/t6.png';
import bomberEnemyThrow7Asset from '../Assets/Enemies/Bomber/throw/t7.png';

import bomberEnemyDeath1Asset from '../Assets/Enemies/Bomber/death/d1.png';
import bomberEnemyDeath2Asset from '../Assets/Enemies/Bomber/death/d2.png';
import bomberEnemyDeath3Asset from '../Assets/Enemies/Bomber/death/d3.png';
import bomberEnemyDeath4Asset from '../Assets/Enemies/Bomber/death/d4.png';
import bomberEnemyDeath5Asset from '../Assets/Enemies/Bomber/death/d5.png';

import bomberEnemyLadderClimb1Asset from '../Assets/Enemies/Bomber/ladderClimb/l1.png';
import bomberEnemyLadderClimb2Asset from '../Assets/Enemies/Bomber/ladderClimb/l2.png';
import bomberEnemyLadderClimb3Asset from '../Assets/Enemies/Bomber/ladderClimb/l3.png';
import bomberEnemyLadderClimb4Asset from '../Assets/Enemies/Bomber/ladderClimb/l4.png';
import bomberEnemyLadderClimb5Asset from '../Assets/Enemies/Bomber/ladderClimb/l5.png';
import bomberEnemyLadderClimb6Asset from '../Assets/Enemies/Bomber/ladderClimb/l6.png';
import bomberEnemyLadderClimb7Asset from '../Assets/Enemies/Bomber/ladderClimb/l7.png';
import bomberEnemyLadderClimb8Asset from '../Assets/Enemies/Bomber/ladderClimb/l8.png';


import bomberEnemyStandUp1Asset from '../Assets/Enemies/Bomber/standUp/s1.png';
import bomberEnemyStandUp2Asset from '../Assets/Enemies/Bomber/standUp/s2.png';
import bomberEnemyStandUp3Asset from '../Assets/Enemies/Bomber/standUp/s3.png';
import bomberEnemyStandUp4Asset from '../Assets/Enemies/Bomber/standUp/s4.png';
import bomberEnemyStandUp5Asset from '../Assets/Enemies/Bomber/standUp/s5.png';
import bomberEnemyStandUp6Asset from '../Assets/Enemies/Bomber/standUp/s6.png';
import bomberEnemyStandUp7Asset from '../Assets/Enemies/Bomber/standUp/s7.png';

import bomberEnemySetUp1Asset from '../Assets/Enemies/Bomber/bombSetUp/b1.png';
import bomberEnemySetUp2Asset from '../Assets/Enemies/Bomber/bombSetUp/b2.png';


import bomberEnemyBlastAway1Asset from '../Assets/Enemies/Bomber/blastAway/b1.png';

import bomberEnemyHurt1Asset from '../Assets/Enemies/Bomber/hurt/h1.png';

////////////////////////////////////Boss enemy assets////////////////////////////////////////////////////

import BossEnemySuperAsset from '../Assets/Enemies/Boss/super.png';

import bossEnemyIdle1Asset from '../Assets/Enemies/Boss/idle/01.png';
import bossEnemyIdle2Asset from '../Assets/Enemies/Boss/idle/02.png';
import bossEnemyIdle3Asset from '../Assets/Enemies/Boss/idle/03.png';
import bossEnemyIdle4Asset from '../Assets/Enemies/Boss/idle/04.png';
import bossEnemyIdle5Asset from '../Assets/Enemies/Boss/idle/05.png';
import bossEnemyIdle6Asset from '../Assets/Enemies/Boss/idle/06.png';
import bossEnemyIdle7Asset from '../Assets/Enemies/Boss/idle/07.png';
import bossEnemyIdle8Asset from '../Assets/Enemies/Boss/idle/08.png';
import bossEnemyIdle9Asset from '../Assets/Enemies/Boss/idle/09.png';

import bossEnemyBasicAttack1Asset from '../Assets/Enemies/Boss/basicAttack/a1.png';
import bossEnemyBasicAttack2Asset from '../Assets/Enemies/Boss/basicAttack/a2.png';
import bossEnemyBasicAttack3Asset from '../Assets/Enemies/Boss/basicAttack/a3.png';
import bossEnemyBasicAttack4Asset from '../Assets/Enemies/Boss/basicAttack/a4.png';
import bossEnemyBasicAttack5Asset from '../Assets/Enemies/Boss/basicAttack/a5.png';
import bossEnemyBasicAttack6Asset from '../Assets/Enemies/Boss/basicAttack/a6.png';
import bossEnemyBasicAttack7Asset from '../Assets/Enemies/Boss/basicAttack/a7.png';
import bossEnemyBasicAttack8Asset from '../Assets/Enemies/Boss/basicAttack/a8.png';

import bossEnemyDeath1Asset from '../Assets/Enemies/Boss/death/d1.png';
import bossEnemyDeath2Asset from '../Assets/Enemies/Boss/death/d2.png';
import bossEnemyDeath3Asset from '../Assets/Enemies/Boss/death/d3.png';
import bossEnemyDeath4Asset from '../Assets/Enemies/Boss/death/d4.png';
import bossEnemyDeath5Asset from '../Assets/Enemies/Boss/death/d5.png';
import bossEnemyDeath6Asset from '../Assets/Enemies/Boss/death/d6.png';
import bossEnemyDeath7Asset from '../Assets/Enemies/Boss/death/d7.png';
import bossEnemyDeath8Asset from '../Assets/Enemies/Boss/death/d8.png';
import bossEnemyDeath9Asset from '../Assets/Enemies/Boss/death/d9.png';
import bossEnemyDeath10Asset from '../Assets/Enemies/Boss/death/d10.png';
import bossEnemyDeath11Asset from '../Assets/Enemies/Boss/death/d11.png';
import bossEnemyDeath12Asset from '../Assets/Enemies/Boss/death/d12.png';
import bossEnemyDeath13Asset from '../Assets/Enemies/Boss/death/d13.png';

import bossEnemyWalk1Asset from '../Assets/Enemies/Boss/walking/w1.png';
import bossEnemyWalk2Asset from '../Assets/Enemies/Boss/walking/w2.png';
import bossEnemyWalk3Asset from '../Assets/Enemies/Boss/walking/w3.png';
import bossEnemyWalk4Asset from '../Assets/Enemies/Boss/walking/w4.png';
import bossEnemyWalk5Asset from '../Assets/Enemies/Boss/walking/w5.png';
import bossEnemyWalk6Asset from '../Assets/Enemies/Boss/walking/w6.png';
import bossEnemyWalk7Asset from '../Assets/Enemies/Boss/walking/w7.png';
import bossEnemyWalk8Asset from '../Assets/Enemies/Boss/walking/w8.png';
import bossEnemyWalk9Asset from '../Assets/Enemies/Boss/walking/w9.png';

import bossEnemyTeleport1Asset from '../Assets/Enemies/Boss/teleport/t1.png';
import bossEnemyTeleport2Asset from '../Assets/Enemies/Boss/teleport/t2.png';
import bossEnemyTeleport3Asset from '../Assets/Enemies/Boss/teleport/t3.png';
import bossEnemyTeleport4Asset from '../Assets/Enemies/Boss/teleport/t4.png';
import bossEnemyTeleport5Asset from '../Assets/Enemies/Boss/teleport/t5.png';
import bossEnemyTeleport6Asset from '../Assets/Enemies/Boss/teleport/t6.png';
import bossEnemyTeleport7Asset from '../Assets/Enemies/Boss/teleport/t7.png';
import bossEnemyTeleport8Asset from '../Assets/Enemies/Boss/teleport/t8.png';
import bossEnemyTeleport9Asset from '../Assets/Enemies/Boss/teleport/t9.png';
import bossEnemyTeleport10Asset from '../Assets/Enemies/Boss/teleport/t10.png';
import bossEnemyTeleport11Asset from '../Assets/Enemies/Boss/teleport/t11.png';
import bossEnemyTeleport12Asset from '../Assets/Enemies/Boss/teleport/t12.png';
import bossEnemyTeleport13Asset from '../Assets/Enemies/Boss/teleport/ts.png';

import bossEnemyLaugh1Asset from '../Assets/Enemies/Boss/laughing/l1.png';
import bossEnemyLaugh2Asset from '../Assets/Enemies/Boss/laughing/l2.png';
import bossEnemyLaugh3Asset from '../Assets/Enemies/Boss/laughing/l3.png';
import bossEnemyLaugh4Asset from '../Assets/Enemies/Boss/laughing/l4.png';
import bossEnemyLaugh5Asset from '../Assets/Enemies/Boss/laughing/l5.png';
import bossEnemyLaugh6Asset from '../Assets/Enemies/Boss/laughing/l6.png';
import bossEnemyLaugh7Asset from '../Assets/Enemies/Boss/laughing/l7.png';
import bossEnemyLaugh8Asset from '../Assets/Enemies/Boss/laughing/l8.png';
import bossEnemyLaugh9Asset from '../Assets/Enemies/Boss/laughing/l9.png';
import bossEnemyLaugh10Asset from '../Assets/Enemies/Boss/laughing/l10.png';
import bossEnemyLaugh11Asset from '../Assets/Enemies/Boss/laughing/l11.png';

import bossEnemyKO1Asset from '../Assets/Enemies/Boss/knockOut/01.png';
import bossEnemyKO2Asset from '../Assets/Enemies/Boss/knockOut/02.png';
import bossEnemyKO3Asset from '../Assets/Enemies/Boss/knockOut/03.png';
import bossEnemyKO4Asset from '../Assets/Enemies/Boss/knockOut/04.png';
import bossEnemyKO5Asset from '../Assets/Enemies/Boss/knockOut/05.png';

import lightningEffect1Asset from '../Assets/Enemies/Boss/lightning/l1.png';
import lightningEffect2Asset from '../Assets/Enemies/Boss/lightning/l2.png';
import lightningEffect3Asset from '../Assets/Enemies/Boss/lightning/l3.png';
import lightningEffect4Asset from '../Assets/Enemies/Boss/lightning/l4.png';
import lightningEffect5Asset from '../Assets/Enemies/Boss/lightning/l5.png';
import lightningEffect6Asset from '../Assets/Enemies/Boss/lightning/l6.png';
import lightningEffect7Asset from '../Assets/Enemies/Boss/lightning/l7.png';
import lightningEffect8Asset from '../Assets/Enemies/Boss/lightning/l8.png';

import fireOrbAsset1 from '../Assets/weapon/fireOrb/fo1.png';
import fireOrbAsset2 from '../Assets/weapon/fireOrb/fo2.png';
import fireOrbAsset3 from '../Assets/weapon/fireOrb/fo3.png';
import fireOrbAsset4 from '../Assets/weapon/fireOrb/fo4.png';
import fireOrbAsset5 from '../Assets/weapon/fireOrb/fo5.png';
import fireOrbAsset6 from '../Assets/weapon/fireOrb/fo6.png';
import fireOrbAsset7 from '../Assets/weapon/fireOrb/fo7.png';



/////////////////////////////////////Items assets////////////////////////////////////////////////////
import healthPackAsset from '../Assets/supplyCrate/healthKit.png';
import ammoPackAsset from '../Assets/supplyCrate/ammoCrate.png';


import grenadeBlust1Asset from '../Assets/weapon/Grenade/blust1.png';
import grenadeBlust2Asset from '../Assets/weapon/Grenade/blust2.png';
import grenadeBlust3Asset from '../Assets/weapon/Grenade/blust3.png';
import grenadeBlust4Asset from '../Assets/weapon/Grenade/blust4.png';
import grenadeBlust5Asset from '../Assets/weapon/Grenade/blust5.png';
import grenadeBlust6Asset from '../Assets/weapon/Grenade/blust6.png';
import grenadeBlust7Asset from '../Assets/weapon/Grenade/blust7.png';


import SMGShootEffectAsset from '../Assets/weapon/SMG/SMG_fire.png';


import Bomb from '../Assets/weapon/Bomb/bomb.png';
import supplyCrate from '../Assets/supplyCrate/supplyCrate.png';
import desSupplyCrate from '../Assets/supplyCrate/desSupplyCrate.png';
import airbomb from '../Assets/supplyCrate/airBomb.png';
import aim from '../Assets/supplyCrate/aim.png';


////////////////////////////////////////////////////////// Sound effects//////////////////////////////////



import hero1JumpSound from '../Assets/player/ninja/Sound/Jumping_Sound.mp3';
import hero1RunSound from '../Assets/player/ninja/Sound/Running_Sound.mp3';

import hero2JumpSound from '../Assets/player/ninja2/Sound/Jumping_Sound.mp3';
import hero2RunSound from '../Assets/player/ninja2/Sound/Running_Sound.mp3';

import grenadeExplosionSound from '../Assets/weapon/Grenade/grenadeExplosion.mp3';


import SMGShootSound from '../Assets/weapon/SMG/SMG_Sound.mp3';

import laughingSound from '../Assets/Enemies/Boss/laughingSound.mp3';
import attackSound from '../Assets/Enemies/Boss/attackSound.mp3';
import lightningSound from '../Assets/Enemies/Boss/lightningSound.mp3';
import superSound from '../Assets/Enemies/Boss/Super.mp3';
import bossWarningSound from '../Assets/Enemies/Boss/warning.mp3';

import bossDeadSound from '../Assets/Enemies/Boss/dead.mp3';
import bossDead2Sound from '../Assets/Enemies/Boss/dead2.mp3';
import bossBombTimerSound from '../Assets/Enemies/Boss/bombTimer.mp3';
import bossBomberLaughSound from '../Assets/Enemies/Boss/bomberLaugh.mp3';
import bossMissileSound from '../Assets/Enemies/Boss/misile.mp3';
import bossSwordSound from '../Assets/Enemies/Boss/sword.mp3';
import roarSound from '../Assets/Enemies/Boss/roar.mp3';

import boarDeathSound from '../Assets/Enemies/Boar/death/boarDeath.mp3';
import boarRunningSound from '../Assets/Enemies/Boar/running/boarRunning.mp3';

const boarImageAssets = [
    ['boarBreak01', boarBreak01Asset], ['boarBreak02', boarBreak02Asset],
    ['boarBreak03', boarBreak03Asset], ['boarBreak04', boarBreak04Asset],
    ['boarBreak06', boarBreak06Asset], ['boarBreak07', boarBreak07Asset],
    ['boarBreak08', boarBreak08Asset], ['boarBreak09', boarBreak09Asset],
    ['boarBreak10', boarBreak10Asset], ['boarBreak11', boarBreak11Asset],
    ['boarBreak12', boarBreak12Asset],
    ['boarDeath01', boarDeath01Asset], ['boarDeath02', boarDeath02Asset],
    ['boarDeath03', boarDeath03Asset], ['boarDeath04', boarDeath04Asset],
    ['boarDeath05', boarDeath05Asset], ['boarDeath07', boarDeath07Asset],
    ['boarDeath08', boarDeath08Asset], ['boarDeath09', boarDeath09Asset],
    ['boarDeath10', boarDeath10Asset], ['boarDeath11', boarDeath11Asset],
    ['boarDeath12', boarDeath12Asset],
    ['boarIdle01', boarIdle01Asset], ['boarIdle02', boarIdle02Asset],
    ['boarIdle03', boarIdle03Asset], ['boarIdle04', boarIdle04Asset],
    ['boarIdle05', boarIdle05Asset], ['boarIdle06', boarIdle06Asset],
    ['boarIdle07', boarIdle07Asset], ['boarIdle08', boarIdle08Asset],
    ['boarIdle09', boarIdle09Asset], ['boarIdle10', boarIdle10Asset],
    ['boarRunning01', boarRunning01Asset], ['boarRunning02', boarRunning02Asset],
    ['boarRunning03', boarRunning03Asset], ['boarRunning04', boarRunning04Asset],
    ['boarRunning05', boarRunning05Asset], ['boarRunning06', boarRunning06Asset],
    ['boarRunning07', boarRunning07Asset], ['boarRunning08', boarRunning08Asset],
    ['boarRunning09', boarRunning09Asset]
];


export default class PreloadScene extends Phaser.Scene
{
    constructor() 
    {
        
        super('PreloadScene'); 
    }

    preload() 
    {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

       
        const loadingText = this.add.text(width / 2, height / 2, 'Loading... 0%', {
            fontSize: '24px', fill: '#ffffff'
        }).setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            loadingText.setText('Loading... ' + parseInt(value * 100) + '%');
        });

        this.load.on('complete', () => {
            this.scene.start('TitleScreen'); 
        });


        // PreloadScene.js ফাইলের preload() এর ভেতরে
        this.load.image('supplyCrate', supplyCrate); // আপনার সঠিক ফাইল পাথ দিন
        this.load.image('desSupplyCrate', desSupplyCrate); // আপনার সঠিক ফাইল পাথ দিন
        this.load.image('titlepage1', titlepage1Asset);
        this.load.image('titlepage2', titlepage2Asset);
        this.load.video('menuVideo', menuVideoAsset);
        this.load.audio('themeMusicMenu', themeMusicMenuAsset);
        this.load.audio('gameMusic', gameMusic);
        this.load.audio('arena2Music', arena2MusicAsset);
        this.load.audio('selectionSound', selectionSoundAsset);
        this.load.image('charSelectBg', charSelectBgAsset);
        
        this.load.image('arenaBg', arenaAsset);
        this.load.image('arena2Bg', arena2Asset);
        this.load.image('grenade', grenadeAsset);
        this.load.image('fireEffect1', fireEffect1Asset);
        this.load.image('fireEffect2', fireEffect2Asset);
        this.load.image('fireEffect3', fireEffect3Asset);
        this.load.image('fireEffect4', fireEffect4Asset);
        this.load.image('fireEffect5', fireEffect5Asset);
        this.load.image('fireEffect6', fireEffect6Asset);
        this.load.image('landmine', landmineAsset);
        this.load.image('molotov', molotovAsset);
        this.load.image('timeBomb', Bomb);

        this.load.image('heroPP_1', heroPP_1);
        this.load.image('heroPP_2', heroPP_2);
        this.load.image('heroBg_1', heroBg_1);
        this.load.image('heroBg_2', heroBg_2);


                this.load.image('heroIdle1', heroIdle1Asset);
                this.load.image('heroIdle2', heroIdle2Asset);
                this.load.image('heroIdle3', heroIdle3Asset);
                this.load.image('heroIdle4', heroIdle4Asset);
                // Fix: these 3 were already imported above but never
                // actually registered here, so the heroIdle animation
                // (which expects 7 frames — see Game.js) silently ran
                // with 3 missing textures.
                this.load.image('heroIdle5', heroIdle5Asset);
                this.load.image('heroIdle6', heroIdle6Asset);
                this.load.image('heroIdle7', heroIdle7Asset);
                // Run
                this.load.image('heroRun1', heroRun1Asset);
                this.load.image('heroRun2', heroRun2Asset);
                this.load.image('heroRun3', heroRun3Asset);
                this.load.image('heroRun4', heroRun4Asset);
                this.load.image('heroRun5', heroRun5Asset);
                // Jump
                this.load.image('heroJump1', heroJump1Asset);
                this.load.image('heroJump2', heroJump2Asset);
                this.load.image('heroJump3', heroJump3Asset);
                this.load.image('heroJump4', heroJump4Asset);
                this.load.image('heroJump5', heroJump5Asset);
                this.load.image('heroJump6', heroJump6Asset);
                this.load.image('heroJump7', heroJump7Asset);
                this.load.image('heroJump8', heroJump8Asset);
                this.load.image('heroJump9', heroJump9Asset);
                //Climb
                this.load.image('heroClimb1', heroClimb1Asset);
                this.load.image('heroClimb2', heroClimb2Asset);
                this.load.image('heroClimb3', heroClimb3Asset);
                this.load.image('heroClimb4', heroClimb4Asset);
                this.load.image('heroClimb5', heroClimb5Asset);
                this.load.image('heroClimb6', heroClimb6Asset);
                this.load.image('heroClimb7', heroClimb7Asset);
                this.load.image('heroClimb8', heroClimb8Asset);
                // Attack
                this.load.image('heroAttack1', heroAttack1Asset);
                this.load.image('heroAttack2', heroAttack2Asset);
                this.load.image('heroAttack3', heroAttack3Asset);
                this.load.image('heroAttack4', heroAttack4Asset);
                this.load.image('heroAttack5', heroAttack5Asset);
                this.load.image('heroAttack6', heroAttack6Asset);
                this.load.image('heroAttack7', heroAttack7Asset);
                this.load.image('heroAttack8', heroAttack8Asset);

                this.load.image('heroThrow1', heroThrow1Asset);
                this.load.image('heroThrow2', heroThrow2Asset);
                this.load.image('heroThrow3', heroThrow3Asset);
                this.load.image('heroThrow4', heroThrow4Asset);
                this.load.image('heroThrow5', heroThrow5Asset);

                this.load.image('heroDeath1', heroDead1Asset);
                this.load.image('heroDeath2', heroDead2Asset);
                this.load.image('heroDeath3', heroDead3Asset);
                this.load.image('heroDeath4', heroDead4Asset);
                this.load.image('heroDeath5', heroDead5Asset);
                this.load.image('heroDeath6', heroDead6Asset);
                this.load.image('heroDeath7', heroDead7Asset);

                this.load.image('heroSMGSide', heroSMGSideAsset);
                this.load.image('heroSMGUP', heroSMGUpAsset);
                this.load.image('heroSMGDown', heroSMGDownAsset);



                this.load.image('hero2Idle1', hero2Idle1Asset);
                this.load.image('hero2Idle2', hero2Idle2Asset);
                this.load.image('hero2Idle3', hero2Idle3Asset);
                this.load.image('hero2Idle4', hero2Idle4Asset);
                this.load.image('hero2Idle5', hero2Idle5Asset);

                this.load.image('hero2Run1', hero2Run1Asset);
                this.load.image('hero2Run2', hero2Run2Asset);
                this.load.image('hero2Run3', hero2Run3Asset);
                this.load.image('hero2Run4', hero2Run4Asset);
                this.load.image('hero2Run5', hero2Run5Asset);
                this.load.image('hero2Run6', hero2Run6Asset);
                this.load.image('hero2Run7', hero2Run7Asset);
                this.load.image('hero2Run8', hero2Run8Asset);
                this.load.image('hero2Run9', hero2Run9Asset);
                this.load.image('hero2Run10', hero2Run10Asset);

                this.load.image('hero2Jump1', hero2Jump1Asset);
                this.load.image('hero2Jump2', hero2Jump2Asset);
                this.load.image('hero2Jump3', hero2Jump3Asset);
                this.load.image('hero2Jump4', hero2Jump4Asset);
                this.load.image('hero2Jump5', hero2Jump5Asset);
                this.load.image('hero2Jump6', hero2Jump6Asset);
                this.load.image('hero2Jump7', hero2Jump7Asset);
                this.load.image('hero2Jump8', hero2Jump8Asset);
                this.load.image('hero2Jump9', hero2Jump9Asset);
                this.load.image('hero2Jump10', hero2Jump10Asset);

                this.load.image('hero2Climb1', hero2Climb1Asset);
                this.load.image('hero2Climb2', hero2Climb2Asset);
                this.load.image('hero2Climb3', hero2Climb3Asset);
                this.load.image('hero2Climb4', hero2Climb4Asset);
                this.load.image('hero2Climb5', hero2Climb5Asset);
                this.load.image('hero2Climb6', hero2Climb6Asset);
                this.load.image('hero2Climb7', hero2Climb7Asset);
                this.load.image('hero2Climb8', hero2Climb8Asset);

                this.load.image('hero2Attack1', hero2Attack1Asset);
                this.load.image('hero2Attack2', hero2Attack2Asset);
                this.load.image('hero2Attack3', hero2Attack3Asset);
                this.load.image('hero2Attack4', hero2Attack4Asset);
                this.load.image('hero2Attack5', hero2Attack5Asset);
                this.load.image('hero2Attack6', hero2Attack6Asset);
                this.load.image('hero2Attack7', hero2Attack7Asset);
                this.load.image('hero2Attack8', hero2Attack8Asset);
                this.load.image('hero2Attack9', hero2Attack9Asset);
                this.load.image('hero2Attack10', hero2Attack10Asset);

                this.load.image('hero2Throw1', hero2Throw1Asset);
                this.load.image('hero2Throw2', hero2Throw2Asset);
                this.load.image('hero2Throw3', hero2Throw3Asset);
                this.load.image('hero2Throw4', hero2Throw4Asset);
                this.load.image('hero2Throw5', hero2Throw5Asset);

                this.load.image('hero2Death1', hero2Dead1Asset);
                this.load.image('hero2Death2', hero2Dead2Asset);
                this.load.image('hero2Death3', hero2Dead3Asset);
                this.load.image('hero2Death4', hero2Dead4Asset);
                this.load.image('hero2Death5', hero2Dead5Asset);
                this.load.image('hero2Death6', hero2Dead6Asset);

                this.load.image('hero2SMGSide', hero2SMGSideAsset);
                this.load.image('hero2SMGUP', hero2SMGUpAsset);
                this.load.image('hero2SMGDown', hero2SMGDownAsset);



///////////////////////////////////////enemy assets////////////////////////////////////////////////////


                this.load.image('enemy1Idle1', enemy1Idle1Asset);
                this.load.image('enemy1Idle2', enemy1Idle2Asset);
                this.load.image('enemy1Idle3', enemy1Idle3Asset);
                this.load.image('enemy1Idle4', enemy1Idle4Asset);
                this.load.image('enemy1Idle5', enemy1Idle5Asset);
                this.load.image('enemy1Idle6', enemy1Idle6Asset);

                this.load.image('enemy1Run1', enemy1Run1Asset);
                this.load.image('enemy1Run2', enemy1Run2Asset);
                this.load.image('enemy1Run3', enemy1Run3Asset);
                this.load.image('enemy1Run4', enemy1Run4Asset);
                this.load.image('enemy1Run5', enemy1Run5Asset);
                this.load.image('enemy1Run6', enemy1Run6Asset);
                this.load.image('enemy1Run7', enemy1Run7Asset);

                this.load.image('enemy1Attack1', enemy1Attack1Asset);
                this.load.image('enemy1Attack2', enemy1Attack2Asset);
                this.load.image('enemy1Attack3', enemy1Attack3Asset);
                this.load.image('enemy1Attack4', enemy1Attack4Asset);

                this.load.image('enemy1LadderClimb1', enemy1ladderClimb1Asset);
                this.load.image('enemy1LadderClimb2', enemy1ladderClimb2Asset);
                this.load.image('enemy1LadderClimb3', enemy1ladderClimb3Asset);
                this.load.image('enemy1LadderClimb4', enemy1ladderClimb4Asset);
                this.load.image('enemy1LadderClimb5', enemy1ladderClimb5Asset);
                this.load.image('enemy1LadderClimb6', enemy1ladderClimb6Asset);
                this.load.image('enemy1LadderClimb7', enemy1ladderClimb7Asset);
                this.load.image('enemy1LadderClimb8', enemy1ladderClimb8Asset);

                this.load.image('enemy1Hurt', enemy1hurt1Asset);


                this.load.image('enemy1Jump1', enemy1Jump1Asset);
                this.load.image('enemy1Jump2', enemy1Jump2Asset);
                this.load.image('enemy1Jump3', enemy1Jump3Asset);
                this.load.image('enemy1Jump4', enemy1Jump4Asset);

                this.load.image('enemy1StandUp1', enemy1StandUp1Asset);
                this.load.image('enemy1StandUp2', enemy1StandUp2Asset);
                this.load.image('enemy1StandUp3', enemy1StandUp3Asset);
                this.load.image('enemy1StandUp4', enemy1StandUp4Asset);
                this.load.image('enemy1StandUp5', enemy1StandUp5Asset);
                this.load.image('enemy1StandUp6', enemy1StandUp6Asset);

                this.load.image('enemy1BlastAway', enemy1blastAway1Asset);

                this.load.image('enemy1Death1', enemy1Death1Asset);
                this.load.image('enemy1Death2', enemy1Death2Asset);
                this.load.image('enemy1Death3', enemy1Death3Asset);
                this.load.image('enemy1Death4', enemy1Death4Asset);
                this.load.image('enemy1Death5', enemy1Death5Asset);
                this.load.image('enemy1Death6', enemy1Death6Asset);
                boarImageAssets.forEach(([key, asset]) => this.load.image(key, asset));
 //////////////////////////////////bomber enemy assets////////////////////////////////////////////////////
                this.load.image('bomberEnemyIdle1', bomberEnemyIdle1Asset);
                this.load.image('bomberEnemyIdle2', bomberEnemyIdle2Asset);
                this.load.image('bomberEnemyIdle3', bomberEnemyIdle3Asset);
                this.load.image('bomberEnemyIdle4', bomberEnemyIdle4Asset);

                this.load.image('bomberEnemyRun1', bomberEnemyRun1Asset);
                this.load.image('bomberEnemyRun2', bomberEnemyRun2Asset);
                this.load.image('bomberEnemyRun3', bomberEnemyRun3Asset);
                this.load.image('bomberEnemyRun4', bomberEnemyRun4Asset);
                this.load.image('bomberEnemyRun5', bomberEnemyRun5Asset);
                this.load.image('bomberEnemyRun6', bomberEnemyRun6Asset);
                this.load.image('bomberEnemyRun7', bomberEnemyRun7Asset);

                this.load.image('bomberEnemyJump1', bomberEnemyJump1Asset);
                this.load.image('bomberEnemyJump2', bomberEnemyJump2Asset);
                this.load.image('bomberEnemyJump3', bomberEnemyJump3Asset);
                this.load.image('bomberEnemyJump4', bomberEnemyJump4Asset);
                this.load.image('bomberEnemyJump5', bomberEnemyJump5Asset);
                this.load.image('bomberEnemyJump6', bomberEnemyJump6Asset);
                this.load.image('bomberEnemyJump7', bomberEnemyJump7Asset);
                this.load.image('bomberEnemyJump8', bomberEnemyJump8Asset);
                this.load.image('bomberEnemyJump9', bomberEnemyJump9Asset);
                this.load.image('bomberEnemyJump10', bomberEnemyJump10Asset);

                this.load.image('bomberEnemyThrow1', bomberEnemyThrow1Asset);
                this.load.image('bomberEnemyThrow2', bomberEnemyThrow2Asset);
                this.load.image('bomberEnemyThrow3', bomberEnemyThrow3Asset);
                this.load.image('bomberEnemyThrow4', bomberEnemyThrow4Asset);
                this.load.image('bomberEnemyThrow5', bomberEnemyThrow5Asset);
                this.load.image('bomberEnemyThrow6', bomberEnemyThrow6Asset);
                this.load.image('bomberEnemyThrow7', bomberEnemyThrow7Asset);


                this.load.image('bomberEnemyDeath1', bomberEnemyDeath1Asset);
                this.load.image('bomberEnemyDeath2', bomberEnemyDeath2Asset);
                this.load.image('bomberEnemyDeath3', bomberEnemyDeath3Asset);
                this.load.image('bomberEnemyDeath4', bomberEnemyDeath4Asset);
                this.load.image('bomberEnemyDeath5', bomberEnemyDeath5Asset);




                this.load.image('bomberEnemyClimb1', bomberEnemyLadderClimb1Asset);
                this.load.image('bomberEnemyClimb2', bomberEnemyLadderClimb2Asset);
                this.load.image('bomberEnemyClimb3', bomberEnemyLadderClimb3Asset);
                this.load.image('bomberEnemyClimb4', bomberEnemyLadderClimb4Asset);
                this.load.image('bomberEnemyClimb5', bomberEnemyLadderClimb5Asset);
                this.load.image('bomberEnemyClimb6', bomberEnemyLadderClimb6Asset);
                this.load.image('bomberEnemyClimb7', bomberEnemyLadderClimb7Asset);
                this.load.image('bomberEnemyClimb8', bomberEnemyLadderClimb8Asset);


                this.load.image('bomberEnemyStandUp1', bomberEnemyStandUp1Asset);
                this.load.image('bomberEnemyStandUp2', bomberEnemyStandUp2Asset);
                this.load.image('bomberEnemyStandUp3', bomberEnemyStandUp3Asset);
                this.load.image('bomberEnemyStandUp4', bomberEnemyStandUp4Asset);
                this.load.image('bomberEnemyStandUp5', bomberEnemyStandUp5Asset);
                this.load.image('bomberEnemyStandUp6', bomberEnemyStandUp6Asset);
                this.load.image('bomberEnemyStandUp7', bomberEnemyStandUp7Asset);

                this.load.image('bomberEnemyBombSetUp1', bomberEnemySetUp1Asset);
                this.load.image('bomberEnemyBombSetUp2', bomberEnemySetUp2Asset);


                this.load.image('bomberEnemyBlastAway', bomberEnemyBlastAway1Asset);
                this.load.image('bomberEnemyHurt', bomberEnemyHurt1Asset);

                //////////////////////////boss enemy assets////////////////////////////////////////////////////
                this.load.image('bossSuper', BossEnemySuperAsset);

                this.load.image('bossIdle1', bossEnemyIdle1Asset);
                this.load.image('bossIdle2', bossEnemyIdle2Asset);
                this.load.image('bossIdle3', bossEnemyIdle3Asset);
                this.load.image('bossIdle4', bossEnemyIdle4Asset);
                this.load.image('bossIdle5', bossEnemyIdle5Asset);
                this.load.image('bossIdle6', bossEnemyIdle6Asset);
                this.load.image('bossIdle7', bossEnemyIdle7Asset);
                this.load.image('bossIdle8', bossEnemyIdle8Asset);
                this.load.image('bossIdle9', bossEnemyIdle9Asset);

                this.load.image('bossAttack1', bossEnemyBasicAttack1Asset);
                this.load.image('bossAttack2', bossEnemyBasicAttack2Asset);
                this.load.image('bossAttack3', bossEnemyBasicAttack3Asset);
                this.load.image('bossAttack4', bossEnemyBasicAttack4Asset);
                this.load.image('bossAttack5', bossEnemyBasicAttack5Asset);
                this.load.image('bossAttack6', bossEnemyBasicAttack6Asset);
                this.load.image('bossAttack7', bossEnemyBasicAttack7Asset);
                this.load.image('bossAttack8', bossEnemyBasicAttack8Asset);

                this.load.image('bossDeath1', bossEnemyDeath1Asset);
                this.load.image('bossDeath2', bossEnemyDeath2Asset);
                this.load.image('bossDeath3', bossEnemyDeath3Asset);
                this.load.image('bossDeath4', bossEnemyDeath4Asset);
                this.load.image('bossDeath5', bossEnemyDeath5Asset);
                this.load.image('bossDeath6', bossEnemyDeath6Asset);
                this.load.image('bossDeath7', bossEnemyDeath7Asset);
                this.load.image('bossDeath8', bossEnemyDeath8Asset);
                this.load.image('bossDeath9', bossEnemyDeath9Asset);
                this.load.image('bossDeath10', bossEnemyDeath10Asset);
                this.load.image('bossDeath11', bossEnemyDeath11Asset);
                this.load.image('bossDeath12', bossEnemyDeath12Asset);
                this.load.image('bossDeath13', bossEnemyDeath13Asset);

                this.load.image('bossWalk1', bossEnemyWalk1Asset);
                this.load.image('bossWalk2', bossEnemyWalk2Asset);
                this.load.image('bossWalk3', bossEnemyWalk3Asset);
                this.load.image('bossWalk4', bossEnemyWalk4Asset);
                this.load.image('bossWalk5', bossEnemyWalk5Asset);
                this.load.image('bossWalk6', bossEnemyWalk6Asset);
                this.load.image('bossWalk7', bossEnemyWalk7Asset);
                this.load.image('bossWalk8', bossEnemyWalk8Asset);
                this.load.image('bossWalk9', bossEnemyWalk9Asset);

                this.load.image('bossTeleport1', bossEnemyTeleport1Asset);
                this.load.image('bossTeleport2', bossEnemyTeleport2Asset);
                this.load.image('bossTeleport3', bossEnemyTeleport3Asset);
                this.load.image('bossTeleport4', bossEnemyTeleport4Asset);
                this.load.image('bossTeleport5', bossEnemyTeleport5Asset);
                this.load.image('bossTeleport6', bossEnemyTeleport6Asset);
                this.load.image('bossTeleport7', bossEnemyTeleport7Asset);
                this.load.image('bossTeleport8', bossEnemyTeleport8Asset);
                this.load.image('bossTeleport9', bossEnemyTeleport9Asset);
                this.load.image('bossTeleport10', bossEnemyTeleport10Asset);
                this.load.image('bossTeleport11', bossEnemyTeleport11Asset);
                this.load.image('bossTeleport12', bossEnemyTeleport12Asset);
                this.load.image('bossTeleport13', bossEnemyTeleport13Asset);

                this.load.image('bosslaugh1', bossEnemyLaugh1Asset);
                this.load.image('bosslaugh2', bossEnemyLaugh2Asset);
                this.load.image('bosslaugh3', bossEnemyLaugh3Asset);
                this.load.image('bosslaugh4', bossEnemyLaugh4Asset);
                this.load.image('bosslaugh5', bossEnemyLaugh5Asset);
                this.load.image('bosslaugh6', bossEnemyLaugh6Asset);
                this.load.image('bosslaugh7', bossEnemyLaugh7Asset);
                this.load.image('bosslaugh8', bossEnemyLaugh8Asset);
                this.load.image('bosslaugh9', bossEnemyLaugh9Asset);
                this.load.image('bosslaugh10', bossEnemyLaugh10Asset);
                this.load.image('bosslaugh11', bossEnemyLaugh11Asset);

                this.load.image('bossKO1', bossEnemyKO1Asset);
                this.load.image('bossKO2', bossEnemyKO2Asset);
                this.load.image('bossKO3', bossEnemyKO3Asset);
                this.load.image('bossKO4', bossEnemyKO4Asset);
                this.load.image('bossKO5', bossEnemyKO5Asset);

                this.load.image('lightningEffect1', lightningEffect1Asset);
                this.load.image('lightningEffect2', lightningEffect2Asset);
                this.load.image('lightningEffect3', lightningEffect3Asset);
                this.load.image('lightningEffect4', lightningEffect4Asset);
                this.load.image('lightningEffect5', lightningEffect5Asset);
                this.load.image('lightningEffect6', lightningEffect6Asset);
                this.load.image('lightningEffect7', lightningEffect7Asset);
                this.load.image('lightningEffect8', lightningEffect8Asset);

                this.load.image('fireOrb1', fireOrbAsset1);
                this.load.image('fireOrb2', fireOrbAsset2);
                this.load.image('fireOrb3', fireOrbAsset3);
                this.load.image('fireOrb4', fireOrbAsset4);
                this.load.image('fireOrb5', fireOrbAsset5);
                this.load.image('fireOrb6', fireOrbAsset6);
                this.load.image('fireOrb7', fireOrbAsset7);
 


                
//////////////////////////////items assets////////////////////////////////////////////////////
                this.load.image('healthPack', healthPackAsset);
                this.load.image('ammoPack', ammoPackAsset);



                this.load.image('grenadeBlust1', grenadeBlust1Asset);
                this.load.image('grenadeBlust2', grenadeBlust2Asset);
                this.load.image('grenadeBlust3', grenadeBlust3Asset);
                this.load.image('grenadeBlust4', grenadeBlust4Asset);
                this.load.image('grenadeBlust5', grenadeBlust5Asset);
                this.load.image('grenadeBlust6', grenadeBlust6Asset);
                this.load.image('grenadeBlust7', grenadeBlust7Asset);

                this.load.image('SMGShootEffect', SMGShootEffectAsset);

                this.load.image('airBomb', airbomb);
                this.load.image('aim', aim);





                ///////////////////////////////////////sound effects/////////////////////////////////////////
                this.load.audio('hero1JumpSound', hero1JumpSound);
                this.load.audio('hero1RunSound', hero1RunSound);
                
                
                this.load.audio('hero2JumpSound', hero2JumpSound);
                this.load.audio('hero2RunSound', hero2RunSound);
                
                
                this.load.audio('grenadeExplosionSound', grenadeExplosionSound);
                
                
                this.load.audio('SMGShootSound', SMGShootSound);
                this.load.audio('laughingSound', laughingSound);
                this.load.audio('lightningSound', lightningSound);
                this.load.audio('attackSound', attackSound);
                this.load.audio('super', superSound);
                this.load.audio('warning', bossWarningSound);

                this.load.audio('dead', bossDeadSound);
                this.load.audio('dead2', bossDead2Sound);
                this.load.audio('roar', roarSound);

                this.load.audio('bombTimer', bossBombTimerSound);
                this.load.audio('bomberLaugh', bossBomberLaughSound);
                this.load.audio('misile', bossMissileSound);
                this.load.audio('sword', bossSwordSound);
                this.load.audio('boarDeathSound', boarDeathSound);
                this.load.audio('boarRunningSound', boarRunningSound);


 


    }
}