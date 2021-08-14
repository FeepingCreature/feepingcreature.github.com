Package Managers and the Invalidation Problem
# Package Managers and the Invalidation Problem

The "invalidation problem" is the question of how package managers, such as npm, pip or gem, should respond
to the fact that requirements specified in a package may be wrong.

## Terms

### Semantic Version

This is a summary of [Semantic Versioning 2.0.0](https://semver.org/).

A "semantic version" or "semver", is a triple of numbers, such as "1.0.33". They are called "major version",
"minor version" and "patch version".

The goal of semantic versions is to encode in the version number of a package whether that package can
_substitute_ for another version. When a package version can substitute for another version, it is called
"semver compatible."

The major version indicates incompatible releases, such as fundamental redesigns or removal of deprecations.
Whenever you break compatibility with previous versions, increment the major version.

A simple number, such as "version 2", usually means "2.0.0". For instance,
"Python 3" vs "Python 2" was a breaking release, and thus incremented the major version. Packages with
different major versions are **never semver compatible.**

The minor version indicates added features. Whenever you add a new feature, increment the minor version.

Packages with different minor versions are semver compatible if the **substituted minor version is greater,**
so long as the major version is the same.

This is because only features were added, not removed.

The patch version indicates bugfixes. It is likewise semver compatible if the **substituted patch version
is greater,** so long as the other two are the same.

### Package

A package is anything, software, definitions, data, that has these two properties:

- it exists in one or multiple versions, "releases".
- it can depend on other packages, or other packages can depend on it.

The requirement of a package is usually one or multiple of:

- semver compatible (see above),
- greater than or equal,
- equal,
- unequal,
- smaller.

When would you want to specify an "unequal" or "smaller" requirement? This can happen if a new version
introduces a bug. For instance, if 2.0.7 of FooSoft was just released but it doesn't work with your code,
you may want to add a requirement of `"foo-soft": "<2.0.7"`, or `"foo-soft": "!=2.0.7"` if you are confident
that the issue will be fixed in the next version.

A package manager is a tool that, given a set of available packages, a "repository", at various versions,
and a "root package", assign versions to packages so that:

1. Every package that is transitively required by the root package has exactly one version selected.
2. All requirements of the selected packages are fulfilled.
3. Given 2, all selected versions are as new as possible.

You may note that 3 is underdefined and may admit contradictory resolutions. Different package managers
solve this problem in different ways, such as erroring, or selecting whichever solution is found first.

# The Invalidation Problem

This is all fine and good, and generally works well. However, consider the aforementioned FooSoft issue.

We may have started out with a library "BarLib" at version "1.0.3". At this point, we lived in an optimistic
utopia in which we thought software bugs were finally behind us, and so selected an open-ended version of
`"foo-soft": ">=2.0.0"`. Now FooSoft 2.0.7 has introduced a bug, which means BarLib is not compatible
with "2.0.7". We change the requirement in BarLib's requirements file to say `"foo-soft": ">=2.0.0 <2.0.7"`.
Then, having fixed a bug, we release this version as 1.0.4.

However, we have now introduced a contradiction!

The newest version of "BarLib" is, deliberately, not compatible with the newest version of FooSoft.
From the perspective of the package manager, it can either select:

- BarLib 1.0.4 with FooSoft 2.0.6
- BarLib 1.0.3 with FooSoft 2.0.7

However, the second assignment is *wrong!* The whole reason for BarLib 1.0.4 was that FooSoft 2.0.7 didn't
work with BarLib.

From the perspective of the package manager, it is impossible to tell these two resolutions apart.

How do we select the right pair of versions? In other words, how can we allow BarLib 1.0.4 to **invalidate**
its previous, wrong decision to permit all versions of FooSoft?

I can see several possibilities:

## Always Newest

Always select the newest patch version of everything. If it errors, then it errors.

Upside: Very easy.

Downside: If a package is broken, it's broken with no way to fix it.

## Always Newest, Restrict In Root

Always select the newest patch version, unless this contradicts a requirement in the root package.

This allows the user to decide which package resolution is picked. For instance, the user can
mask BarLib 1.0.4 in the root package if 1.0.3 with 2.0.7 worked fine for them,
or they can mask FooSoft 2.0.7 and validate BarLib's change.

Upside: Still pretty easy.

Downside: Requires duplicated active effort in every package that pulls in FooSoft.

## Always Newest, Depth-order

As we walk the requirement graph breadth-first, we always pick the newest version.
However, in doing so we may pick up constraints on packages not yet selected.

These constraints are applied to future selections.

For instance, since BarLib 1.0.4 is selected (it's the newest version), it excludes FooSoft 2.0.7.
In other words, we "restrict as we go."

Upside: This is pretty easy to follow if you read along.

Downside: You can end up with contradictory selections. For instance, if a previous package pulled in FooSoft
at 2.0.7, then BarLib adding the requirement for FooSoft `!=2.0.7` will cause resolution to fail.

However, we can always fall back on specifying the requirement in the root, which will cause it
to take priority, same as in the "Restrict from Root" approach. Or if one package is pulling in
both FooSoft and BarLib, we can fix the issue there.

## Patch overriding

The requirements for a package are always taken from the latest patch version with the same minor and major.

So the fact that BarLib 1.0.4 was released with a "!=" constraint on FooSoft,
*retroactively invalidates* the open-ended requirement in BarLib 1.0.3. BarLib 1.0.3 can still be selected
by a package that selected `"bar-lib": "=1.0.3"` or such, but BarLib 1.0.3 can *no longer* be selected with
FooSoft 2.0.7 by any means.

Upside: Even bugs in the requirements file can be patched.

Downside: A resolution that was previously valid can retroactively become invalid. However, arguably
this happens if the resolution was *wrong to begin with,* so this can be seen as a feature.

Downside: This is *really, really confusing.*

# Conclusion

I originally wrote this page to argue for patch overriding, but on writing it I noticed that
"always newest, depth-order" is just obviously the best approach.

It's easy to follow and implement and can still always create a successful resolution with
whatever properties you desire.

It also gets away without any backtracking, which is a common source of extreme slowdowns in
package managers.

It's so clearly superior that I threw out several suggested approaches, such as "newer released version
beats older dependency", because they were clearly so bad in comparison as to be not worth considering.

Mission accomplished?
