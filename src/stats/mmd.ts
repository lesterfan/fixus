
import {
	MMD__DefineEvent,
	MMD__LogEvent,
	MMD_DefineValue,
	MMD_FLAG_LOSER,
	MMD_FLAG_WINNER,
	MMD_FlagPlayer,
	MMD_GOAL_HIGH,
	MMD_GOAL_LOW,
	MMD_OP_SET,
	MMD_SUGGEST_NONE,
	MMD_TYPE_INT,
	MMD_UpdateValueInt,
} from "./w3mmd";
import { addScriptHook, W3TS_HOOK } from "@voces/w3ts";
import { wolfTeam, saveskills, fillArray } from "../shared";
import { log } from "../util/log";
import { isUnitSheep, isUnitWolf } from "sheep/saveDeath";

const structuresBuilt = fillArray( bj_MAX_PLAYERS, 0 );
const structuresKilled = fillArray( bj_MAX_PLAYERS, 0 );
const unitsKilled = fillArray( bj_MAX_PLAYERS, 0 );
const deaths = fillArray( bj_MAX_PLAYERS, 0 );

const logKill = ( killingUnit: unit, dyingUnit: unit ): void => {

	unitsKilled[ GetPlayerId( GetOwningPlayer( killingUnit ) ) ] ++;

	if ( isUnitSheep( dyingUnit ) || isUnitWolf( dyingUnit ) )
		deaths[ GetPlayerId( GetOwningPlayer( dyingUnit ) ) ] ++;

	MMD__LogEvent(
		"kill",
		I2S( GetUnitTypeId( killingUnit ) ),
		I2S( GetUnitTypeId( dyingUnit ) ),
		GetPlayerName( GetOwningPlayer( killingUnit ) ),
		GetPlayerName( GetOwningPlayer( dyingUnit ) ),
	);

};

const logItem = ( event: "picked up" | "dropped"| "used" | "pawned" | "sell", item: item, unit: unit ): void =>
	MMD__LogEvent(
		"item",
		I2S( GetItemTypeId( item ) ),
		GetPlayerName( GetOwningPlayer( unit ) ),
		I2S( GetUnitTypeId( unit ) ),
		event,
	);

export const endGameStats = ( winner: "sheep" | "wolves", desynced: boolean ): void => {

	try {

		for ( let i = 0; i < bj_MAX_PLAYERS; i ++ )

			if (
				GetPlayerController( Player( i ) ) === MAP_CONTROL_USER &&
				[ PLAYER_SLOT_STATE_PLAYING, PLAYER_SLOT_STATE_LEFT ].includes( GetPlayerSlotState( Player( i ) ) )
			) {

				// wolf values
				if ( IsPlayerInForce( Player( i ), wolfTeam ) ) {

					MMD_UpdateValueInt( "farms killed", Player( i ), MMD_OP_SET, structuresKilled[ i ] );
					MMD_UpdateValueInt( "wolf lumber", Player( i ), MMD_OP_SET, GetPlayerState( Player( i ), PLAYER_STATE_LUMBER_GATHERED ) );
					MMD_UpdateValueInt( "sheep kills", Player( i ), MMD_OP_SET, saveskills[ i ] );
					MMD_UpdateValueInt( "wolf deaths", Player( i ), MMD_OP_SET, saveskills[ i ] );
					MMD_UpdateValueInt( "wolf gold", Player( i ), MMD_OP_SET, GetPlayerState( Player( i ), PLAYER_STATE_GOLD_GATHERED ) );

					// sheep values

				} else {

					MMD_UpdateValueInt( "farms built", Player( i ), MMD_OP_SET, structuresBuilt[ i ] );
					MMD_UpdateValueInt( "saves", Player( i ), MMD_OP_SET, saveskills[ i ] );
					MMD_UpdateValueInt( "sheep deaths", Player( i ), MMD_OP_SET, saveskills[ i ] );
					MMD_UpdateValueInt( "units killed", Player( i ), MMD_OP_SET, unitsKilled[ i ] );
					MMD_UpdateValueInt( "sheep gold", Player( i ), MMD_OP_SET, GetPlayerState( Player( i ), PLAYER_STATE_GOLD_GATHERED ) );

				}

				if ( ! desynced )
					if ( IsPlayerInForce( Player( i ), wolfTeam ) )

						if ( winner === "wolves" ) MMD_FlagPlayer( Player( i ), MMD_FLAG_WINNER );
						else MMD_FlagPlayer( Player( i ), MMD_FLAG_LOSER );

					else if ( winner === "sheep" ) MMD_FlagPlayer( Player( i ), MMD_FLAG_WINNER );
					else MMD_FlagPlayer( Player( i ), MMD_FLAG_LOSER );

			}

	} catch ( err ) {

		log( err );

	}

};

addScriptHook( W3TS_HOOK.MAIN_AFTER, (): void => {

	let t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_DEATH );
	TriggerAddAction( t, (): void => {

		if (
			! IsUnitType( GetDyingUnit(), UNIT_TYPE_STRUCTURE ) &&
			GetKillingUnit() &&
			GetDyingUnit()
		)
			logKill( GetKillingUnit(), GetDyingUnit() );

		else {

			const playerIndex = GetPlayerId( GetOwningPlayer( GetKillingUnit() ) );
			structuresKilled[ playerIndex ] ++;

		}

	} );

	t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_PICKUP_ITEM );
	TriggerAddAction( t, (): void => logItem( "picked up", GetManipulatedItem(), GetTriggerUnit() ) );

	t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_DROP_ITEM );
	TriggerAddAction( t, (): void => logItem( "dropped", GetManipulatedItem(), GetTriggerUnit() ) );

	t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_USE_ITEM );
	TriggerAddAction( t, (): void => logItem( "used", GetManipulatedItem(), GetTriggerUnit() ) );

	t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_SELL_ITEM );
	TriggerAddAction( t, (): void => logItem( "sell", GetSoldItem(), GetBuyingUnit() ) );

	t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_PAWN_ITEM );
	TriggerAddAction( t, (): void => logItem( "pawned", GetSoldItem(), GetSellingUnit() ) );

	t = CreateTrigger();
	TriggerRegisterTimerEvent( t, 0, false );
	TriggerAddAction( t, () => {

		MMD__DefineEvent( "kill", "{2:player} ({0}) killed {3:player} ({1})", "killingType", "dyingType", "pid:killingPlayer", "pid:dyingPlayer" );
		MMD__DefineEvent( "item", "{1:player} ({2}) {3} {0}", "item", "pid:player", "unit", "event" );

		// sheep
		MMD_DefineValue( "farms built", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );
		MMD_DefineValue( "farms killed", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );
		MMD_DefineValue( "saves", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );
		MMD_DefineValue( "sheep deaths", MMD_TYPE_INT, MMD_GOAL_LOW, MMD_SUGGEST_NONE );
		MMD_DefineValue( "sheep gold", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );
		MMD_DefineValue( "units killed", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );

		// wolves
		MMD_DefineValue( "wolf lumber", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );
		MMD_DefineValue( "sheep kills", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );
		MMD_DefineValue( "wolf deaths", MMD_TYPE_INT, MMD_GOAL_LOW, MMD_SUGGEST_NONE );
		MMD_DefineValue( "wolf gold", MMD_TYPE_INT, MMD_GOAL_HIGH, MMD_SUGGEST_NONE );

	} );

	t = CreateTrigger();
	TriggerRegisterAnyUnitEventBJ( t, EVENT_PLAYER_UNIT_CONSTRUCT_START );
	TriggerAddAction( t, (): void => {

		const playerIndex = GetPlayerId( GetOwningPlayer( GetTriggerUnit() ) );
		structuresBuilt[ playerIndex ] ++;

	} );

} );
