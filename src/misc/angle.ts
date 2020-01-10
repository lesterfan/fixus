
import { addScriptHook, W3TS_HOOK } from "w3ts";
import { registerCommand } from "../shared";

// ===========================================================================
// Trigger: miscAngle
// ===========================================================================

const action = ( { angle }: {angle: number} ): void => {

	if ( GetLocalPlayer() !== GetTriggerPlayer() ) return;

	SetCameraField( CAMERA_FIELD_ANGLE_OF_ATTACK, angle, 0 );

};

// ===========================================================================
// todo: can I create and register triggers outside this hook?
addScriptHook( W3TS_HOOK.MAIN_AFTER, (): void =>
	registerCommand( {
		command: "angle",
		alias: "a",
		args: [ { name: "angle", type: Number } ],
		fn: action,
	} ),
);