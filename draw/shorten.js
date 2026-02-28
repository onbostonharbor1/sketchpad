/*	  if (thing.shorten) {
	      tArm1 = thing.arm1;
	      tArm2 = thing.arm2;
	      shortenArms(thing);
	      }

	      called after arms are created
*/
    function shortenArm(arm) {
	              // thing.shorten is the percent to shorten.
	              // I want the amount left
	let shorten = (100 - thing.shorten)/100;
	let deltaX = Math.abs(arm[arm.length-1].x - arm[0].x);
//	if (deltaX == 0)
//	    deltaX = 100;
	let length = shorten*deltaX;
	let j = 0;
	for (let i=0; i < arm.length -1; i++) {
	    deltaX = Math.abs((arm[i].x - arm1[0].x));
	    if (deltaX > length ) {
			j = i;
			break;
	    }
	}
	if (j==0) j=arm.length -1;;
	return j;

	// if (BOTH) {
	//     let k = 0;
	//     for (let i=0; i < thing.arm2.length -1; i++) {
	// 	        deltaX = Math.abs((thing.arm2[i].x - thing.arm2[0].x));
	// 	        if (deltaX > length ) {
	// 	        	k = i;
	// 	        	break;
	// 	   		}
	//  	}
	//     	if (k==0) k=thing.arm2.length -1;;
	//     	thing.arm2.length=k;
	// }
	// thing.arm2.splice(j,thing.arm2.length-1);
	// if (thing.arm2.length < thing.arm1.length)
	    // thing.arm2.splice(0,j-1);
    }
